/**
 * Phase 1 — runAgentWithVerification: 타임아웃/재시도/빈 산출물 검증 로직.
 *
 * 실제 CLI spawn 없이 spawnFn·getChangedCount를 주입해 결정론적으로 검증한다.
 */
import {
  runAgentWithVerification,
  promptExpectsFileChanges,
  type RunWithVerificationOptions,
} from "@/lib/runner/spawn-with-verification";
import type { SpawnAgentOptions } from "@/lib/runner/spawn-runner";

function makeSpawn(exitCodes: number[]) {
  const calls: SpawnAgentOptions[] = [];
  let i = 0;
  const spawnFn = async (opts: SpawnAgentOptions) => {
    calls.push(opts);
    const code = exitCodes[Math.min(i, exitCodes.length - 1)];
    i += 1;
    opts.onComplete(code);
  };
  return { spawnFn, calls };
}

const base: Omit<RunWithVerificationOptions, "spawnFn" | "getChangedCount"> = {
  agent: "claude-code",
  prompt: "Implement the feature and write files.",
  cwd: "/tmp/x",
  expectsChanges: true,
  onLog: () => {},
};

describe("runAgentWithVerification", () => {
  it("clean success with changes → no retry, not empty", async () => {
    const { spawnFn, calls } = makeSpawn([0]);
    const res = await runAgentWithVerification({
      ...base,
      spawnFn,
      getChangedCount: () => 3,
    });
    expect(res.exitCode).toBe(0);
    expect(res.attempts).toBe(1);
    expect(res.emptyOutput).toBe(false);
    expect(calls.length).toBe(1);
  });

  it("exit 0 but no changes on a change-expecting phase → retries then flags empty", async () => {
    const { spawnFn, calls } = makeSpawn([0, 0]);
    const res = await runAgentWithVerification({
      ...base,
      maxAttempts: 2,
      spawnFn,
      getChangedCount: () => 0, // never produces files
    });
    expect(res.attempts).toBe(2);
    expect(res.emptyOutput).toBe(true);
    expect(calls.length).toBe(2);
    // retry prompt must carry the reinforcement directive
    expect(calls[1].prompt).toContain("[RETRY]");
  });

  it("retry succeeds on second attempt → not empty", async () => {
    let count = 0;
    const { spawnFn, calls } = makeSpawn([0, 0]);
    const res = await runAgentWithVerification({
      ...base,
      maxAttempts: 2,
      spawnFn,
      getChangedCount: () => {
        // empty on first check, files on second
        count += 1;
        return count >= 2 ? 2 : 0;
      },
    });
    expect(res.attempts).toBe(2);
    expect(res.emptyOutput).toBe(false);
    expect(calls.length).toBe(2);
  });

  it("agent self-commits (clean tree but HEAD advanced) → not empty, no retry", async () => {
    const { spawnFn, calls } = makeSpawn([0]);
    let head = "sha-before";
    const res = await runAgentWithVerification({
      ...base,
      spawnFn,
      getChangedCount: () => 0, // tree is clean because the agent committed
      getHeadRefFn: () => {
        const cur = head;
        head = "sha-after"; // advances after the first read (before → after)
        return cur;
      },
    });
    expect(res.exitCode).toBe(0);
    expect(res.attempts).toBe(1);
    expect(res.emptyOutput).toBe(false);
    expect(calls.length).toBe(1);
  });

  it("read-only phase (expectsChanges=false) → no retry even with zero changes", async () => {
    const { spawnFn, calls } = makeSpawn([0]);
    const res = await runAgentWithVerification({
      ...base,
      expectsChanges: false,
      spawnFn,
      getChangedCount: () => 0,
    });
    expect(res.attempts).toBe(1);
    expect(res.emptyOutput).toBe(false);
    expect(calls.length).toBe(1);
  });

  it("hard failure (exit != 0) → returns immediately, no retry", async () => {
    const { spawnFn, calls } = makeSpawn([1, 0]);
    const res = await runAgentWithVerification({
      ...base,
      maxAttempts: 3,
      spawnFn,
      getChangedCount: () => 0,
    });
    expect(res.exitCode).toBe(1);
    expect(res.attempts).toBe(1);
    expect(res.emptyOutput).toBe(false); // empty only when exit 0
    expect(calls.length).toBe(1);
  });
});

describe("promptExpectsFileChanges", () => {
  it("defaults to true for normal implementation prompts", () => {
    expect(promptExpectsFileChanges("Add a new endpoint and tests")).toBe(true);
  });
  it("detects read-only English markers", () => {
    expect(promptExpectsFileChanges("This is research only. Do not modify any files.")).toBe(false);
    expect(promptExpectsFileChanges("Read-only analysis of the codebase")).toBe(false);
  });
  it("detects read-only Korean markers", () => {
    expect(promptExpectsFileChanges("코드베이스를 조사만 하고 보고하라")).toBe(false);
    expect(promptExpectsFileChanges("설계만 하고 파일은 만들지 마라")).toBe(false);
  });
  it("empty prompt → true", () => {
    expect(promptExpectsFileChanges("")).toBe(true);
  });
});
