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
