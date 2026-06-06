/**
 * Tests for lib/harness/handoff-generator.ts (PRD §15).
 *
 * Fully filesystem-isolated: every run writes under a unique os.tmpdir()
 * directory injected via options.outputRoot, and is cleaned up after.
 */

import fs from "fs/promises";
import os from "os";
import path from "path";

import { generateHandoff } from "@/lib/harness/handoff-generator";
import type {
  ExecutionRun,
  ExecutionResultPacket,
} from "@/lib/execution-run/types";

function makeRun(overrides: Partial<ExecutionRun> = {}): ExecutionRun {
  return {
    id: "run_20260606_001",
    taskId: "task_123",
    source: "pulk-cto",
    agent: "claude-code",
    status: "passed",
    repoPath: "/repo",
    baseBranch: "main",
    worktreePath: "../.agent-worktrees/pulk-task-123-run-001",
    runBranch: "agent/task-123-run-001",
    prompt: "Add ACR run status to Control Room tree",
    acceptanceCriteria: ["tree shows status", "log tail visible"],
    allowedFiles: ["apps/web/src/features/control-room/**"],
    blockedFiles: [".env"],
    complexity: "C2",
    mode: "implement_verify",
    checks: { typecheck: "pass", build: "pass", playwright: "pass" },
    changedFiles: [
      "apps/web/src/features/control-room/ControlRoomTree.tsx",
      "apps/web/src/api/monitor/control-room-tree/route.ts",
    ],
    diffStat: "2 files changed",
    resultSummary: "Wired run status + log tail into the tree.",
    nextAction: "Review changed files before PR.",
    createdAt: "2026-06-06T00:00:00Z",
    updatedAt: "2026-06-06T00:05:00Z",
    ...overrides,
  };
}

function makePacket(
  run: ExecutionRun,
  overrides: Partial<ExecutionResultPacket> = {},
): ExecutionResultPacket {
  return {
    runId: run.id,
    taskId: run.taskId,
    status: run.status,
    agent: run.agent,
    summary: "Control Room tree now shows ACR run status and log tail.",
    changedFiles: run.changedFiles,
    diffStat: run.diffStat ?? "",
    checks: run.checks,
    artifacts: {},
    recommendation: "human_review",
    nextAction: "Review changed files before PR.",
    ...overrides,
  };
}

let outputRoot: string;

beforeEach(async () => {
  outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "acr-handoff-"));
});

afterEach(async () => {
  await fs.rm(outputRoot, { recursive: true, force: true });
});

const EXPECTED_FILES = [
  "FEATURE.md",
  "SPEC.md",
  "DESIGN.md",
  "DECISIONS.md",
  "STATE.md",
  "SESSION.md",
  "result.json",
  "diff.patch",
  "log.txt",
];

describe("generateHandoff — structure (§15.2)", () => {
  it("writes all 9 artifacts under .handoff/runs/{run_id}/", async () => {
    const run = makeRun();
    const packet = makePacket(run);

    const res = await generateHandoff(
      run,
      packet,
      { diff: "diff --git a/x b/x", log: "agent log line" },
      { outputRoot },
    );

    const expectedDir = path.join(outputRoot, ".handoff", "runs", run.id);
    expect(res.handoffDir).toBe(expectedDir);
    expect(res.files).toHaveLength(9);

    const onDisk = (await fs.readdir(expectedDir)).sort();
    expect(onDisk).toEqual([...EXPECTED_FILES].sort());
  });

  it("returns absolute paths matching the files on disk", async () => {
    const run = makeRun();
    const res = await generateHandoff(
      run,
      makePacket(run),
      { diff: "", log: "" },
      { outputRoot },
    );
    for (const f of res.files) {
      expect(path.isAbsolute(f)).toBe(true);
      await expect(fs.access(f)).resolves.toBeUndefined();
    }
  });
});

describe("generateHandoff — content (§15.3 / §15.4)", () => {
  it("STATE.md carries run id, branch, checks and status", async () => {
    const run = makeRun();
    const packet = makePacket(run);
    const { handoffDir } = await generateHandoff(
      run,
      packet,
      { diff: "d", log: "l" },
      { outputRoot },
    );
    const state = await fs.readFile(path.join(handoffDir, "STATE.md"), "utf8");
    expect(state).toContain("run_id: run_20260606_001");
    expect(state).toContain("task_id: task_123");
    expect(state).toContain("branch: agent/task-123-run-001");
    expect(state).toContain("typecheck: pass");
    expect(state).toContain("playwright: pass");
    expect(state).toContain("passed.");
  });

  it("SESSION.md lists a Do Not Touch section with .env and lock files", async () => {
    const run = makeRun();
    const { handoffDir } = await generateHandoff(
      run,
      makePacket(run),
      { diff: "d", log: "l" },
      { outputRoot },
    );
    const session = await fs.readFile(
      path.join(handoffDir, "SESSION.md"),
      "utf8",
    );
    expect(session).toContain("## Do Not Touch");
    expect(session).toContain(".env");
    expect(session).toContain("lock files");
    expect(session).toContain("Review changed files before PR.");
  });

  it("result.json round-trips the packet", async () => {
    const run = makeRun();
    const packet = makePacket(run);
    const { handoffDir } = await generateHandoff(
      run,
      packet,
      { diff: "d", log: "l" },
      { outputRoot },
    );
    const raw = await fs.readFile(
      path.join(handoffDir, "result.json"),
      "utf8",
    );
    expect(JSON.parse(raw)).toEqual(packet);
  });

  it("diff.patch and log.txt carry the injected payload verbatim", async () => {
    const run = makeRun();
    const { handoffDir } = await generateHandoff(
      run,
      makePacket(run),
      { diff: "DIFF-CONTENT", log: "LOG-CONTENT" },
      { outputRoot },
    );
    const diff = await fs.readFile(path.join(handoffDir, "diff.patch"), "utf8");
    const log = await fs.readFile(path.join(handoffDir, "log.txt"), "utf8");
    expect(diff).toContain("DIFF-CONTENT");
    expect(log).toContain("LOG-CONTENT");
  });
});

describe("generateHandoff — robustness", () => {
  it("handles empty acceptance criteria / changed files without throwing", async () => {
    const run = makeRun({ acceptanceCriteria: [], changedFiles: [] });
    const { handoffDir } = await generateHandoff(
      run,
      makePacket(run, { changedFiles: [] }),
      { diff: "", log: "" },
      { outputRoot },
    );
    const feature = await fs.readFile(
      path.join(handoffDir, "FEATURE.md"),
      "utf8",
    );
    expect(feature).toContain("(none recorded)");
  });

  it("is idempotent — re-running overwrites cleanly", async () => {
    const run = makeRun();
    await generateHandoff(run, makePacket(run), { diff: "a", log: "a" }, { outputRoot });
    const res2 = await generateHandoff(
      run,
      makePacket(run),
      { diff: "b", log: "b" },
      { outputRoot },
    );
    const diff = await fs.readFile(
      path.join(res2.handoffDir, "diff.patch"),
      "utf8",
    );
    expect(diff.trim()).toBe("b");
  });
});
