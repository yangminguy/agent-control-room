/**
 * Phase 2 — Review & Merge: git-utils 병합 헬퍼 + coordinateMerge 결정 로직.
 *
 * 실제 임시 git repo(원격 없음)로 검증한다. gh/PR 경로는 원격이 필요하므로
 * 여기서는 로컬 병합·skip·conflict 경로만 다룬다.
 */
import { execFileSync } from "child_process";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import {
  resolveBaseBranch,
  getRemoteUrl,
  mergeBranchLocally,
} from "@/lib/runner/git-utils";
import { coordinateMerge } from "@/lib/runner/merge-coordinator";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).toString();
}

async function makeRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "acr-merge-"));
  git(dir, ["init", "-q"]);
  git(dir, ["checkout", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "t@t.local"]);
  git(dir, ["config", "user.name", "Test"]);
  await fs.writeFile(path.join(dir, "base.txt"), "base\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "init"]);
  return dir;
}

/** main에서 분기해 새 파일을 커밋한 브랜치를 만든다. */
async function makeFeatureBranch(dir: string, branch: string, file: string, content: string) {
  git(dir, ["checkout", "-q", "-b", branch]);
  await fs.writeFile(path.join(dir, file), content);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", `add ${file}`]);
}

describe("git-utils merge helpers", () => {
  it("resolveBaseBranch finds main", async () => {
    const dir = await makeRepo();
    expect(resolveBaseBranch(dir)).toBe("main");
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("getRemoteUrl returns null without a remote", async () => {
    const dir = await makeRepo();
    expect(getRemoteUrl(dir)).toBeNull();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("mergeBranchLocally merges a feature branch into main", async () => {
    const dir = await makeRepo();
    await makeFeatureBranch(dir, "acr/feat-1", "feature.txt", "hello\n");
    const res = mergeBranchLocally(dir, "acr/feat-1", "main");
    expect(res.merged).toBe(true);
    expect(res.conflict).toBe(false);
    // HEAD now on main and the file exists
    expect(git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]).trim()).toBe("main");
    const list = git(dir, ["ls-files"]);
    expect(list).toContain("feature.txt");
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("mergeBranchLocally reports conflict and aborts cleanly", async () => {
    const dir = await makeRepo();
    // main edits base.txt
    await fs.writeFile(path.join(dir, "base.txt"), "main-change\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "main edit"]);
    // branch off the *original* commit and edit the same line differently
    git(dir, ["checkout", "-q", "-b", "acr/feat-2", "HEAD~1"]);
    await fs.writeFile(path.join(dir, "base.txt"), "branch-change\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "branch edit"]);

    const res = mergeBranchLocally(dir, "acr/feat-2", "main");
    expect(res.merged).toBe(false);
    expect(res.conflict).toBe(true);
    // working tree is clean again (merge aborted)
    expect(git(dir, ["status", "--porcelain"]).trim()).toBe("");
    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe("coordinateMerge", () => {
  const savedAutoMerge = process.env.ACR_AUTO_MERGE;
  afterEach(() => {
    if (savedAutoMerge === undefined) delete process.env.ACR_AUTO_MERGE;
    else process.env.ACR_AUTO_MERGE = savedAutoMerge;
  });

  it("local repo, no remote → merges into main", async () => {
    delete process.env.ACR_AUTO_MERGE;
    const dir = await makeRepo();
    await makeFeatureBranch(dir, "acr/feat-3", "f3.txt", "x\n");
    const res = coordinateMerge({ cwd: dir, branch: "acr/feat-3", planTitle: "Plan A", riskLevel: "D2" });
    expect(res.action).toBe("merged");
    expect(res.conflict).toBe(false);
    expect(git(dir, ["ls-files"])).toContain("f3.txt");
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("ACR_AUTO_MERGE=0 → skipped", async () => {
    process.env.ACR_AUTO_MERGE = "0";
    const dir = await makeRepo();
    await makeFeatureBranch(dir, "acr/feat-4", "f4.txt", "x\n");
    const res = coordinateMerge({ cwd: dir, branch: "acr/feat-4", planTitle: "Plan B" });
    expect(res.action).toBe("skipped");
    expect(git(dir, ["branch", "--show-current"]).trim()).toBe("acr/feat-4"); // untouched
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("high-risk (D3) without remote → skipped (awaits approval), branch preserved", async () => {
    delete process.env.ACR_AUTO_MERGE;
    const dir = await makeRepo();
    await makeFeatureBranch(dir, "acr/feat-5", "f5.txt", "x\n");
    const res = coordinateMerge({ cwd: dir, branch: "acr/feat-5", planTitle: "Plan C", riskLevel: "D3" });
    expect(res.action).toBe("skipped");
    expect(res.base).toBe("main");
    // not merged into main
    git(dir, ["checkout", "-q", "main"]);
    expect(git(dir, ["ls-files"])).not.toContain("f5.txt");
    await fs.rm(dir, { recursive: true, force: true });
  });
});
