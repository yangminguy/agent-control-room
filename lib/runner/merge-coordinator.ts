import { execFileSync } from "child_process";
import {
  getRemoteUrl,
  resolveBaseBranch,
  mergeBranchLocally,
} from "@/lib/runner/git-utils";

/**
 * Phase 2 — Review & Merge coordinator.
 *
 * 완료된(all_done) 깨끗한 acr 브랜치를 본류(main/master)에 반영한다.
 *
 * 결정 규칙(사용자 정책):
 *   - 자동 병합 기본 ON. ACR_AUTO_MERGE="0"이면 전체 비활성(opt-out).
 *   - 원격(origin)이 있고 gh CLI가 있으면 → PR만 생성(병합은 CTO/Founder 결정).
 *   - 원격이 없으면(로컬 sandbox) → git merge --no-ff로 직접 병합.
 *   - 위험도 D3+ → 로컬 자동 병합 금지. 원격 있으면 PR만, 없으면 skip(needs_review로 승격).
 *   - 충돌 → abort 후 conflict 반환(호출자가 needs_review 카드로 승격).
 */

export type MergeAction =
  | "merged" // 로컬 main에 병합 완료
  | "pr_created" // 원격에 PR 생성(병합 보류)
  | "conflict" // 병합 충돌 → 사람 검토 필요
  | "skipped"; // 비활성/대상 없음/고위험 보류

export interface MergeCoordinationResult {
  action: MergeAction;
  detail: string;
  base?: string;
  prUrl?: string;
  conflict: boolean;
}

export interface CoordinateMergeInput {
  cwd: string;
  branch: string;
  planTitle: string;
  /** L5 위험도(D1-D5). 없으면 저위험으로 간주. */
  riskLevel?: string;
}

function isAutoMergeEnabled(): boolean {
  return process.env.ACR_AUTO_MERGE !== "0";
}

function isHighRisk(riskLevel?: string): boolean {
  return riskLevel === "D3" || riskLevel === "D4" || riskLevel === "D5";
}

function ghAvailable(cwd: string): boolean {
  try {
    execFileSync("gh", ["--version"], { cwd, stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

/** 원격 PR을 생성한다. 성공 시 PR URL, 실패 시 null. */
function createPullRequest(
  cwd: string,
  branch: string,
  base: string,
  title: string,
): string | null {
  try {
    // 브랜치를 원격에 push(이미 있으면 갱신).
    execFileSync("git", ["push", "-u", "origin", branch], { cwd, stdio: ["pipe", "pipe", "pipe"] });
    const out = execFileSync(
      "gh",
      ["pr", "create", "--base", base, "--head", branch, "--title", title, "--body", `Automated PR by ACR for "${title}".`],
      { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    const url = String(out).trim().split("\n").pop() ?? "";
    // Only treat a real PR URL as success; anything else (warning, "already
    // exists", empty) falls through to the local-merge/skip path.
    return url.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}

export function coordinateMerge(input: CoordinateMergeInput): MergeCoordinationResult {
  const { cwd, branch, planTitle, riskLevel } = input;

  if (!isAutoMergeEnabled()) {
    return { action: "skipped", detail: "auto-merge disabled (ACR_AUTO_MERGE=0)", conflict: false };
  }

  const base = resolveBaseBranch(cwd);
  if (!base) {
    return { action: "skipped", detail: "no main/master base branch found", conflict: false };
  }
  if (branch === base) {
    return { action: "skipped", detail: "already on base branch (nothing to merge)", base, conflict: false };
  }

  const remote = getRemoteUrl(cwd);

  // 원격 + gh → PR만 생성(병합은 CTO/Founder 결정).
  if (remote && ghAvailable(cwd)) {
    const prUrl = createPullRequest(cwd, branch, base, planTitle);
    if (prUrl) {
      return { action: "pr_created", detail: `PR opened for ${branch} -> ${base}`, base, prUrl, conflict: false };
    }
    // PR 생성 실패 + 고위험이면 로컬 병합 금지 → skip.
    if (isHighRisk(riskLevel)) {
      return { action: "skipped", detail: "PR creation failed; high-risk → manual review", base, conflict: false };
    }
    // 저위험이면 로컬 병합으로 폴백.
  } else if (isHighRisk(riskLevel)) {
    // 원격 없음 + 고위험 → 로컬 자동 병합 금지.
    return { action: "skipped", detail: "high-risk (D3+) without remote → awaiting founder approval", base, conflict: false };
  }

  // 로컬 병합(저위험 또는 원격 없음).
  const result = mergeBranchLocally(cwd, branch, base, `ACR merge: ${planTitle} [${branch}]`);
  if (result.merged) {
    return { action: "merged", detail: result.reason, base, conflict: false };
  }
  if (result.conflict) {
    return { action: "conflict", detail: result.reason, base, conflict: true };
  }
  return { action: "skipped", detail: result.reason, base, conflict: false };
}
