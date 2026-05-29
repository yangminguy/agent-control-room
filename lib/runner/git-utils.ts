import { execFileSync, execSync } from "child_process";
import fs from "fs";
import { resolve } from "path";

/**
 * 제공된 경로가 프로젝트 범위 내인지 검증한다. (경로 순회 방지)
 * projectRoot로부터 상대 경로로만 접근 가능하도록 제한.
 */
export function validateCwdSafety(cwd: string, projectRoot: string): boolean {
  try {
    const resolved = fs.realpathSync(resolve(cwd));
    const root = fs.realpathSync(resolve(projectRoot));
    return resolved === root || resolved.startsWith(root + require("path").sep);
  } catch {
    return false;
  }
}

export function resolveRealPath(inputPath: string): string | null {
  try {
    return fs.realpathSync(resolve(inputPath));
  } catch {
    return null;
  }
}

function assertSafeBranchSegment(segment: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(segment)) {
    throw new Error(`Unsafe branch segment: ${segment}`);
  }
}

/**
 * 태스크 ID와 제목으로부터 안전한 git 브랜치 이름을 생성한다.
 * 형식: acr/{taskId}-{YYYYMMDD}-{HHMM}
 * 예: acr/pt-018-20260520-2100
 */
export function generateBranchName(taskId: string, title?: string): string {
  assertSafeBranchSegment(taskId);
  const now = new Date();
  const yyyymmdd = now.toISOString().split("T")[0].replace(/-/g, "");
  const hhmm = String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0");

  return `acr/${taskId}-${yyyymmdd}-${hhmm}`;
}

/**
 * 현재 디렉토리의 미커밋된 변경사항 여부를 확인한다.
 * git status --porcelain을 실행하고 변경사항이 있으면 true 반환.
 */
export async function checkUncommittedChanges(cwd: string): Promise<boolean> {
  try {
    const output = execSync("git status --porcelain", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output.trim().length > 0;
  } catch (error) {
    return true;
  }
}

/**
 * 새로운 git 브랜치를 생성한다.
 * git checkout -b {branchName}을 실행한다.
 */
export async function createBranch(
  branchName: string,
  cwd: string,
): Promise<void> {
  try {
    if (!/^acr\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}-\d{8}-\d{4}$/.test(branchName)) {
      throw new Error(`Unsafe branch name: ${branchName}`);
    }

    execFileSync("git", ["checkout", "-b", branchName], {
      cwd,
      stdio: "inherit",
    });
  } catch (error) {
    throw new Error(`Failed to create branch ${branchName}: ${error}`);
  }
}

/**
 * Stage and commit all changes on the current branch. Returns true if a commit
 * was created, false if there was nothing to commit. Inline -c identity so the
 * commit works even when the repo has no user.name/email configured.
 *
 * Multi-phase plans run sequentially in the same cwd; committing after each phase
 * keeps the tree clean so the next phase's checkUncommittedChanges guard passes
 * and createBranch carries the prior phase's work forward.
 */
export async function commitAll(cwd: string, message: string): Promise<boolean> {
  try {
    execFileSync("git", ["add", "-A"], { cwd, stdio: ["pipe", "pipe", "pipe"] });
    const staged = execSync("git status --porcelain", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (!staged) return false;
    execFileSync(
      "git",
      ["-c", "user.email=acr@l5.local", "-c", "user.name=ACR Runner", "commit", "-m", message],
      { cwd, stdio: ["pipe", "pipe", "pipe"] },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * 현재 HEAD가 가리키는 브랜치 이름을 반환한다.
 */
export async function getCurrentBranch(cwd: string): Promise<string> {
  try {
    const output = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output.trim();
  } catch (error) {
    throw new Error(`Failed to get current branch: ${error}`);
  }
}

/**
 * Phase 16: 완료된 phase의 diff 요약을 생성한다.
 * 기본 baseRef는 `main`이며, 존재하지 않으면 `master`로 폴백.
 * 작업 디렉토리가 git repo가 아니거나 diff 실패 시 빈 문자열 반환.
 */
export function getDiffSummary(cwd: string, baseRef = "main", maxBytes = 4000): string {
  try {
    let base = baseRef;
    try {
      execSync(`git rev-parse --verify ${base}`, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    } catch {
      base = "master";
      try {
        execSync(`git rev-parse --verify ${base}`, { cwd, stdio: ["pipe", "pipe", "pipe"] });
      } catch {
        return "";
      }
    }
    const stat = execSync(`git diff ${base}...HEAD --stat`, {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return stat.length > maxBytes ? stat.slice(0, maxBytes) + "\n...[truncated]" : stat;
  } catch {
    return "";
  }
}

/**
 * Phase 16: 로그 버퍼의 마지막 N라인을 반환.
 */
export function getLogTail(logBuffer: string[], maxLines = 40): string {
  return logBuffer.slice(-maxLines).join("\n");
}

// ─────────────────────────────────────────────────────────
// Phase 2 — Review & Merge helpers
// ─────────────────────────────────────────────────────────

/**
 * 현재 HEAD 커밋 SHA를 반환한다. git repo가 아니거나 커밋이 없으면 "".
 * Phase 1: 에이전트가 스스로 커밋하는 경우(작업 트리는 clean) HEAD 전진으로
 * 산출물 생성을 감지하기 위해 사용한다.
 */
export function getHeadRef(cwd: string): string {
  try {
    return execSync("git rev-parse HEAD", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

/** origin 원격 URL을 반환한다. 원격이 없으면 null. */
export function getRemoteUrl(cwd: string): string | null {
  try {
    const url = execSync("git remote get-url origin", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

/** 병합 대상 기준 브랜치를 해석한다: main → master → null. */
export function resolveBaseBranch(cwd: string): string | null {
  for (const base of ["main", "master"]) {
    try {
      execSync(`git rev-parse --verify ${base}`, { cwd, stdio: ["pipe", "pipe", "pipe"] });
      return base;
    } catch {
      // try next
    }
  }
  return null;
}

export interface LocalMergeResult {
  merged: boolean;
  conflict: boolean;
  reason: string;
}

/**
 * Phase 2: branch를 base에 로컬 병합한다(--no-ff). 충돌 시 merge --abort 후
 * conflict=true로 반환한다(되돌리기 안전). 성공 후 HEAD는 base에 위치한다.
 * 다음 plan의 첫 phase가 base에서 분기하므로 정상.
 */
export function mergeBranchLocally(
  cwd: string,
  branch: string,
  base: string,
  message?: string,
): LocalMergeResult {
  // branch 존재 확인 (execFileSync array form — no shell interpolation).
  try {
    execFileSync("git", ["rev-parse", "--verify", branch], { cwd, stdio: ["pipe", "pipe", "pipe"] });
  } catch {
    return { merged: false, conflict: false, reason: `branch not found: ${branch}` };
  }
  try {
    execFileSync("git", ["checkout", base], { cwd, stdio: ["pipe", "pipe", "pipe"] });
  } catch (err) {
    return { merged: false, conflict: false, reason: `checkout ${base} failed: ${String(err)}` };
  }
  try {
    execFileSync(
      "git",
      [
        "-c",
        "user.email=acr@l5.local",
        "-c",
        "user.name=ACR Runner",
        "merge",
        "--no-ff",
        "--no-edit",
        "-m",
        message ?? `ACR merge: ${branch} -> ${base}`,
        branch,
      ],
      { cwd, stdio: ["pipe", "pipe", "pipe"] },
    );
    return { merged: true, conflict: false, reason: `merged ${branch} into ${base}` };
  } catch (err) {
    // 충돌 또는 기타 실패 → 안전하게 abort.
    // ls-files -u(unmerged paths)가 가장 신뢰할 수 있는 충돌 신호.
    let conflict = false;
    try {
      const unmerged = execFileSync("git", ["ls-files", "-u"], {
        cwd,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).toString().trim();
      conflict = unmerged.length > 0;
    } catch {
      // ignore
    }
    try {
      execFileSync("git", ["merge", "--abort"], { cwd, stdio: ["pipe", "pipe", "pipe"] });
    } catch {
      // no merge in progress
    }
    return {
      merged: false,
      conflict,
      reason: conflict ? `merge conflict ${branch} -> ${base}` : `merge failed: ${String(err)}`,
    };
  }
}
