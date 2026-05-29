import { spawnAgent, type SpawnAgentOptions } from "@/lib/runner/spawn-runner";
import { collectChangedFiles } from "@/lib/runner/file-boundary";
import { getHeadRef } from "@/lib/runner/git-utils";

/**
 * Phase 1 — "빈 브랜치" 방지 래퍼.
 *
 * 문제: spawnAgent가 exit 0으로 끝나도 에이전트가 글만 출력하고 파일을 안 만드는
 * 경우가 있다(빈 브랜치). 그러면 runner는 거짓 "completed"를 보고한다.
 *
 * 해결: 실행 후 git 변경 파일 수를 확인한다.
 *   - 변경이 예상되는 phase(expectsChanges)인데 exit 0 + 변경 0 → 재시도(최대 maxAttempts).
 *     재시도 시 프롬프트에 "실제로 파일을 생성/수정하라"는 보강 지시를 덧붙인다.
 *   - 재시도 소진 후에도 비어 있으면 emptyOutput=true로 반환 → 호출자가 needs_review로 승격.
 *   - read-only phase(조사/설계 등)는 expectsChanges=false → 빈 산출물을 정상으로 본다.
 *   - exit≠0(하드 실패)은 재시도하지 않고 즉시 반환(별도 blocked 처리 경로).
 */

export interface RunWithVerificationOptions {
  agent: "claude-code" | "codex" | "antigravity";
  prompt: string;
  cwd: string;
  timeoutMs?: number;
  /** 최대 시도 횟수(첫 시도 포함). 기본 2 = 최초 1회 + 재시도 1회. */
  maxAttempts?: number;
  /** 이 phase가 파일 변경을 만들어야 하는가. false면 빈 산출물을 정상 처리. */
  expectsChanges: boolean;
  onLog: (line: string) => void;
  /** 테스트 주입용. 기본은 실제 spawnAgent. */
  spawnFn?: (opts: SpawnAgentOptions) => Promise<void>;
  /** 테스트 주입용. 기본은 git 미커밋 변경 파일 수. */
  getChangedCount?: (cwd: string) => number;
  /** 테스트 주입용. 기본은 git HEAD SHA. 에이전트가 스스로 커밋한 경우 감지. */
  getHeadRefFn?: (cwd: string) => string;
}

export interface RunWithVerificationResult {
  exitCode: number;
  attempts: number;
  /** exit 0 + 변경 예상 + 모든 시도 후에도 변경 0 → true (빈 브랜치). */
  emptyOutput: boolean;
  changedCount: number;
}

const RETRY_DIRECTIVE =
  "\n\n[RETRY] The previous attempt produced no file changes. You MUST actually create or edit files on disk to complete this task — do not only describe the change in text. Apply the change to the repository now.";

/**
 * read-only 의도를 가진 프롬프트인지 휴리스틱으로 판별한다.
 * 기본값은 "변경 예상(true)"이며, 명시적 read-only 신호가 있을 때만 false.
 */
export function promptExpectsFileChanges(prompt: string): boolean {
  if (!prompt) return true;
  const p = prompt.toLowerCase();
  const readOnlySignals = [
    "read-only",
    "read only",
    "do not modify",
    "do not edit",
    "do not change",
    "no file changes",
    "without modifying",
    "analysis only",
    "research only",
    "plan only",
    "investigate only",
    "조사만",
    "분석만",
    "설계만",
    "검토만",
    "읽기 전용",
    "수정하지",
    "파일을 만들지",
  ];
  return !readOnlySignals.some((s) => p.includes(s));
}

function defaultChangedCount(cwd: string): number {
  try {
    return collectChangedFiles(cwd).length;
  } catch {
    return 0;
  }
}

/**
 * spawnAgent를 감싸 타임아웃·재시도·산출물 검증을 추가한다.
 */
export async function runAgentWithVerification(
  opts: RunWithVerificationOptions,
): Promise<RunWithVerificationResult> {
  const {
    agent,
    prompt,
    cwd,
    timeoutMs,
    expectsChanges,
    onLog,
  } = opts;
  const envAttempts = Number(process.env.ACR_MAX_ATTEMPTS);
  const defaultAttempts = Number.isFinite(envAttempts) && envAttempts >= 1 ? envAttempts : 2;
  const maxAttempts = Math.max(1, opts.maxAttempts ?? defaultAttempts);
  const spawnFn = opts.spawnFn ?? spawnAgent;
  const getChangedCount = opts.getChangedCount ?? defaultChangedCount;
  const getHeadRefFn = opts.getHeadRefFn ?? getHeadRef;

  let exitCode = 1;
  let attempts = 0;
  let produced = false;
  let lastChangedCount = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    const attemptPrompt = attempt === 1 ? prompt : prompt + RETRY_DIRECTIVE;
    if (attempt > 1) {
      onLog(`[RETRY] Attempt ${attempt}/${maxAttempts} — prior run produced no output.`);
    }

    // Snapshot HEAD so an agent that commits its own work (clean tree but HEAD
    // advanced) is still counted as having produced output.
    const headBefore = getHeadRefFn(cwd);

    exitCode = await new Promise<number>((resolve) => {
      spawnFn({
        agent,
        prompt: attemptPrompt,
        cwd,
        timeoutMs,
        onLog,
        onComplete: (code: number) => resolve(code),
      }).catch((err) => {
        onLog(`[ERROR] spawn failed: ${err instanceof Error ? err.message : String(err)}`);
        resolve(1);
      });
    });

    // Hard failure → do not retry; surfaced as blocked by the caller.
    if (exitCode !== 0) break;

    // Produced output = uncommitted changes OR the agent advanced HEAD itself.
    lastChangedCount = getChangedCount(cwd);
    const headAdvanced = headBefore !== "" && getHeadRefFn(cwd) !== headBefore;
    produced = lastChangedCount > 0 || headAdvanced;

    // Clean success with output, or a read-only phase → done.
    if (!expectsChanges || produced) break;

    // exit 0 but no output on a phase that should produce changes → retry.
    if (attempt < maxAttempts) {
      onLog(`[VERIFY] exit 0 but no file changes detected — will retry.`);
    }
  }

  const emptyOutput = exitCode === 0 && expectsChanges && !produced;
  if (emptyOutput) {
    onLog(`[VERIFY] No file changes after ${attempts} attempt(s). Flagging for review (empty output).`);
  }

  return { exitCode, attempts, emptyOutput, changedCount: lastChangedCount };
}
