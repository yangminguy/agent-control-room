/**
 * Tests for lib/workspace/workspace-store.ts
 *
 * All fs.promises calls are mocked — no real disk I/O occurs.
 * The in-memory store is reset before each test by clearing globalThis.__workspaceStore.
 */

import fs from "fs/promises";
import type { AgentWorkspace, WorkspaceArtifact } from "@/lib/workspace/agent-workspace-types";

// ─── Mock fs/promises ─────────────────────────────────────────────────────────

jest.mock("fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" })),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

// ─── Import after mocks are set up ───────────────────────────────────────────

import {
  createWorkspace,
  getWorkspace,
  updateWorkspaceStatus,
  addChangedFile,
  addArtifact,
  listWorkspacesByTask,
  archiveWorkspace,
  deleteWorkspace,
} from "@/lib/workspace/workspace-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/;

function resetStore(): void {
  // Clear the in-memory singleton so each test starts fresh
  const g = globalThis as typeof globalThis & { __workspaceStore?: Map<string, AgentWorkspace> };
  g.__workspaceStore = new Map();
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("workspace-store", () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
    // Default: readFile fails with ENOENT so hydrateFromDisk starts empty
    mockFs.readFile.mockRejectedValue(
      Object.assign(new Error("ENOENT: no such file"), { code: "ENOENT" }),
    );
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  // ─── createWorkspace ────────────────────────────────────────────────────────

  describe("createWorkspace()", () => {
    it("returns success with a generated UUID id", async () => {
      const result = await createWorkspace("task-1", "claude-code");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it("sets status to 'created'", async () => {
      const result = await createWorkspace("task-1", "claude-code");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe("created");
    });

    it("builds branchName containing the taskId", async () => {
      const result = await createWorkspace("task-abc", "claude-code");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.branchName).toMatch(/^task-task-abc-ws-/);
    });

    it("branchName contains first 8 chars of the workspace id", async () => {
      const result = await createWorkspace("task-abc", "codex");
      expect(result.success).toBe(true);
      if (!result.success) return;
      const idPrefix = result.data.id.slice(0, 8);
      expect(result.data.branchName).toContain(idPrefix);
    });

    it("createdAt is a valid ISO 8601 string", async () => {
      const result = await createWorkspace("task-1", "claude-code");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.createdAt).toMatch(ISO_8601_RE);
    });

    it("updatedAt equals createdAt on creation", async () => {
      const result = await createWorkspace("task-1", "claude-code");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.updatedAt).toBe(result.data.createdAt);
    });

    it("returns failure when taskId is empty string", async () => {
      const result = await createWorkspace("", "claude-code");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/taskId/i);
    });

    it("returns failure when taskId is only whitespace", async () => {
      const result = await createWorkspace("   ", "claude-code");
      expect(result.success).toBe(false);
    });

    it("stores planId when provided", async () => {
      const result = await createWorkspace("task-1", "claude-code", "plan-xyz");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.planId).toBe("plan-xyz");
    });

    it("planId is undefined when not provided", async () => {
      const result = await createWorkspace("task-1", "claude-code");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.planId).toBeUndefined();
    });

    it("changedFiles is empty array on creation", async () => {
      const result = await createWorkspace("task-1", "claude-code");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.changedFiles).toEqual([]);
    });

    it("artifacts is empty array on creation", async () => {
      const result = await createWorkspace("task-1", "claude-code");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.artifacts).toEqual([]);
    });

    // ─── runtimeId default mapping ────────────────────────────────────────────

    it("maps claude-code → claude-direct", async () => {
      const result = await createWorkspace("task-1", "claude-code");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.runtimeId).toBe("claude-direct");
    });

    it("maps codex → codex-direct", async () => {
      const result = await createWorkspace("task-1", "codex");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.runtimeId).toBe("codex-direct");
    });

    it("maps antigravity → antigravity-direct", async () => {
      const result = await createWorkspace("task-1", "antigravity");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.runtimeId).toBe("antigravity-direct");
    });
  });

  // ─── getWorkspace ────────────────────────────────────────────────────────────

  describe("getWorkspace()", () => {
    it("returns the workspace that was just created", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      const got = await getWorkspace(created.data.id);
      expect(got.success).toBe(true);
      if (!got.success) return;
      expect(got.data.id).toBe(created.data.id);
      expect(got.data.taskId).toBe("task-1");
    });

    it("returns failure for a nonexistent workspace id", async () => {
      const result = await getWorkspace("does-not-exist");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/not found/i);
    });

    it("error message includes the requested id", async () => {
      const result = await getWorkspace("missing-id-abc");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toContain("missing-id-abc");
    });
  });

  // ─── updateWorkspaceStatus ────────────────────────────────────────────────────

  describe("updateWorkspaceStatus()", () => {
    it("changes the workspace status", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      const updated = await updateWorkspaceStatus(created.data.id, "running");
      expect(updated.success).toBe(true);
      if (!updated.success) return;
      expect(updated.data.status).toBe("running");
    });

    it("updates updatedAt to a later timestamp", async () => {
      const before = Date.now();
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      // Small delay to ensure updatedAt differs
      await new Promise((r) => setTimeout(r, 2));

      const updated = await updateWorkspaceStatus(created.data.id, "approved");
      expect(updated.success).toBe(true);
      if (!updated.success) return;

      const updatedTime = new Date(updated.data.updatedAt).getTime();
      const createdTime = new Date(created.data.createdAt).getTime();
      expect(updatedTime).toBeGreaterThanOrEqual(createdTime);
      expect(updated.data.updatedAt).toMatch(ISO_8601_RE);
    });

    it("does NOT change createdAt", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      const updated = await updateWorkspaceStatus(created.data.id, "merged");
      expect(updated.success).toBe(true);
      if (!updated.success) return;
      expect(updated.data.createdAt).toBe(created.data.createdAt);
    });

    it("returns failure for nonexistent workspace", async () => {
      const result = await updateWorkspaceStatus("ghost-id", "running");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/not found/i);
    });
  });

  // ─── addChangedFile ────────────────────────────────────────────────────────────

  describe("addChangedFile()", () => {
    it("appends a new file path", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      const result = await addChangedFile(created.data.id, "src/foo.ts");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.changedFiles).toContain("src/foo.ts");
    });

    it("accumulates multiple distinct file paths", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      await addChangedFile(created.data.id, "src/a.ts");
      const result = await addChangedFile(created.data.id, "src/b.ts");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.changedFiles).toEqual(["src/a.ts", "src/b.ts"]);
    });

    it("prevents duplicates — second call with same path is silently ignored", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      await addChangedFile(created.data.id, "src/foo.ts");
      const result = await addChangedFile(created.data.id, "src/foo.ts");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.changedFiles).toEqual(["src/foo.ts"]);
      expect(result.data.changedFiles).toHaveLength(1);
    });

    it("returns failure for nonexistent workspace", async () => {
      const result = await addChangedFile("ghost-id", "src/foo.ts");
      expect(result.success).toBe(false);
    });
  });

  // ─── addArtifact ──────────────────────────────────────────────────────────────

  describe("addArtifact()", () => {
    it("appends an artifact with the provided metadata", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      const artifact: WorkspaceArtifact = {
        type: "file",
        path: "dist/output.js",
        metadata: { size: 1024 },
      };

      const result = await addArtifact(created.data.id, artifact);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.artifacts).toHaveLength(1);
      expect(result.data.artifacts[0]).toMatchObject(artifact);
    });

    it("accumulates multiple artifacts", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      await addArtifact(created.data.id, { type: "file", path: "a.txt" });
      const result = await addArtifact(created.data.id, { type: "diff", path: "b.diff" });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.artifacts).toHaveLength(2);
    });

    it("artifact can include optional content field", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      const artifact: WorkspaceArtifact = {
        type: "test_result",
        path: "results.json",
        content: '{"passed":10}',
      };

      const result = await addArtifact(created.data.id, artifact);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.artifacts[0].content).toBe('{"passed":10}');
    });

    it("returns failure for nonexistent workspace", async () => {
      const result = await addArtifact("ghost-id", { type: "file", path: "x.ts" });
      expect(result.success).toBe(false);
    });
  });

  // ─── listWorkspacesByTask ─────────────────────────────────────────────────────

  describe("listWorkspacesByTask()", () => {
    it("returns all workspaces associated with a given taskId", async () => {
      await createWorkspace("task-A", "claude-code");
      await createWorkspace("task-A", "codex");
      await createWorkspace("task-B", "antigravity");

      const result = await listWorkspacesByTask("task-A");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(2);
      expect(result.data.every((ws) => ws.taskId === "task-A")).toBe(true);
    });

    it("returns empty array for a taskId with no workspaces", async () => {
      const result = await listWorkspacesByTask("task-does-not-exist");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([]);
    });

    it("does not include workspaces from other tasks", async () => {
      await createWorkspace("task-X", "claude-code");
      await createWorkspace("task-Y", "codex");

      const result = await listWorkspacesByTask("task-X");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(1);
      expect(result.data[0].taskId).toBe("task-X");
    });
  });

  // ─── archiveWorkspace ──────────────────────────────────────────────────────────

  describe("archiveWorkspace()", () => {
    it("sets workspace status to 'archived'", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      const result = await archiveWorkspace(created.data.id);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe("archived");
    });

    it("record is still retrievable after archive", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      await archiveWorkspace(created.data.id);

      const retrieved = await getWorkspace(created.data.id);
      expect(retrieved.success).toBe(true);
      if (!retrieved.success) return;
      expect(retrieved.data.status).toBe("archived");
      expect(retrieved.data.id).toBe(created.data.id);
    });

    it("returns failure for nonexistent workspace", async () => {
      const result = await archiveWorkspace("ghost-id");
      expect(result.success).toBe(false);
    });
  });

  // ─── deleteWorkspace ───────────────────────────────────────────────────────────

  describe("deleteWorkspace()", () => {
    it("removes the record from the store", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      const deleteResult = await deleteWorkspace(created.data.id);
      expect(deleteResult.success).toBe(true);
      if (!deleteResult.success) return;
      expect(deleteResult.data.deleted).toBe(created.data.id);

      const getResult = await getWorkspace(created.data.id);
      expect(getResult.success).toBe(false);
    });

    it("returns the deleted workspace id in the result", async () => {
      const created = await createWorkspace("task-1", "codex");
      expect(created.success).toBe(true);
      if (!created.success) return;

      const result = await deleteWorkspace(created.data.id);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual({ deleted: created.data.id });
    });

    it("returns failure for nonexistent workspace", async () => {
      const result = await deleteWorkspace("ghost-id");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/not found/i);
    });

    it("subsequent delete of same id returns failure", async () => {
      const created = await createWorkspace("task-1", "claude-code");
      expect(created.success).toBe(true);
      if (!created.success) return;

      await deleteWorkspace(created.data.id);
      const second = await deleteWorkspace(created.data.id);
      expect(second.success).toBe(false);
    });
  });

  // ─── persistStore side effects ─────────────────────────────────────────────────

  describe("disk persistence (fs mock verification)", () => {
    it("calls fs.mkdir and fs.writeFile when creating a workspace", async () => {
      await createWorkspace("task-persist", "claude-code");
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it("continues silently when fs.writeFile fails with EROFS", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValueOnce(
        Object.assign(new Error("EROFS"), { code: "EROFS" }),
      );

      const result = await createWorkspace("task-readonly", "codex");
      // Should still succeed — falls back to volatile memory
      expect(result.success).toBe(true);
    });

    it("continues silently when fs.writeFile fails with EACCES", async () => {
      mockFs.writeFile.mockRejectedValueOnce(
        Object.assign(new Error("EACCES"), { code: "EACCES" }),
      );

      const result = await createWorkspace("task-noperm", "antigravity");
      expect(result.success).toBe(true);
    });
  });
});
