/**
 * Tests for lib/workspace/workspace-resolver.ts
 *
 * fs.promises is fully mocked — no real directories are created.
 * process.cwd() is spied on to return a predictable root.
 */

import fs from "fs/promises";
import path from "path";

// ─── Mock fs/promises ─────────────────────────────────────────────────────────

jest.mock("fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

// ─── Stable cwd for all tests ─────────────────────────────────────────────────

const FAKE_CWD = "/fake/project/root";
let cwdSpy: jest.SpyInstance;

beforeAll(() => {
  cwdSpy = jest.spyOn(process, "cwd").mockReturnValue(FAKE_CWD);
});

afterAll(() => {
  cwdSpy.mockRestore();
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  getWorkspaceRoot,
  resolveWorkspacePath,
  createWorktreeDirectory,
  sanitizeWorkspaceName,
  getWorktreePathCandidates,
} from "@/lib/workspace/workspace-resolver";

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("workspace-resolver", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
  });

  // ─── getWorkspaceRoot ────────────────────────────────────────────────────────

  describe("getWorkspaceRoot()", () => {
    it("returns success with the .claude/workspaces path inside cwd", () => {
      const result = getWorkspaceRoot();
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toBe(path.join(FAKE_CWD, ".claude", "workspaces"));
    });

    it("path starts with the project cwd", () => {
      const result = getWorkspaceRoot();
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.startsWith(FAKE_CWD)).toBe(true);
    });

    it("path ends with .claude/workspaces", () => {
      const result = getWorkspaceRoot();
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.endsWith(path.join(".claude", "workspaces"))).toBe(true);
    });
  });

  // ─── resolveWorkspacePath ────────────────────────────────────────────────────

  describe("resolveWorkspacePath()", () => {
    it("returns a safe absolute path for a valid workspace id", () => {
      const result = resolveWorkspacePath("ws-abc123");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(path.isAbsolute(result.data)).toBe(true);
      expect(result.data).toContain("ws-abc123");
    });

    it("resolved path is inside the project root", () => {
      const result = resolveWorkspacePath("ws-safe");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.startsWith(FAKE_CWD)).toBe(true);
    });

    it("rejects traversal that escapes the project root", () => {
      // FAKE_CWD = /fake/project/root
      // workspacesRoot = /fake/project/root/.claude/workspaces (3 levels deep under root)
      // ../../../../evil resolves to /evil — outside project root
      const result = resolveWorkspacePath("../../../../evil");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/traversal/i);
    });

    it("rejects deep traversal that reaches filesystem root", () => {
      const result = resolveWorkspacePath("../../../../../tmp/evil");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/traversal/i);
    });

    it("rejects absolute path like /etc/passwd", () => {
      // path.resolve(root, '/etc/passwd') === '/etc/passwd' which is outside project root
      const result = resolveWorkspacePath("/etc/passwd");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/traversal/i);
    });

    it("rejects absolute path pointing to /tmp", () => {
      const result = resolveWorkspacePath("/tmp/attack");
      expect(result.success).toBe(false);
    });

    it("accepts a UUID-format workspace id", () => {
      const result = resolveWorkspacePath("550e8400-e29b-41d4-a716-446655440000");
      expect(result.success).toBe(true);
    });
  });

  // ─── sanitizeWorkspaceName ────────────────────────────────────────────────────

  describe("sanitizeWorkspaceName()", () => {
    it("converts spaces to underscores", () => {
      const result = sanitizeWorkspaceName("my workspace name");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toBe("my_workspace_name");
    });

    it("converts forward slashes to underscores", () => {
      const result = sanitizeWorkspaceName("feature/login");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toBe("feature_login");
    });

    it("converts dots to underscores", () => {
      const result = sanitizeWorkspaceName("v1.2.3");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toBe("v1_2_3");
    });

    it("preserves hyphens", () => {
      const result = sanitizeWorkspaceName("my-task-id");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toBe("my-task-id");
    });

    it("preserves alphanumeric characters", () => {
      const result = sanitizeWorkspaceName("Task123");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toBe("Task123");
    });

    it("converts special chars to underscores", () => {
      const result = sanitizeWorkspaceName("task@#$%");
      expect(result.success).toBe(true);
      if (!result.success) return;
      // All special chars become underscores, trailing underscores trimmed
      expect(result.data).toBe("task");
    });

    it("collapses consecutive underscores into one", () => {
      const result = sanitizeWorkspaceName("task   lots   of   spaces");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).not.toContain("__");
    });

    it("trims leading underscores", () => {
      const result = sanitizeWorkspaceName("  leading space");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.startsWith("_")).toBe(false);
    });

    it("trims trailing underscores", () => {
      const result = sanitizeWorkspaceName("trailing space  ");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.endsWith("_")).toBe(false);
    });

    it("returns failure for empty string", () => {
      const result = sanitizeWorkspaceName("");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/empty/i);
    });

    it("returns failure for whitespace-only string", () => {
      const result = sanitizeWorkspaceName("   ");
      expect(result.success).toBe(false);
    });
  });

  // ─── createWorktreeDirectory ──────────────────────────────────────────────────

  describe("createWorktreeDirectory()", () => {
    it("creates directory at .claude/worktrees/<sanitized-id>/ inside cwd", async () => {
      const result = await createWorktreeDirectory("ws-123");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toContain(path.join(".claude", "worktrees", "ws-123"));
    });

    it("calls fs.mkdir with recursive: true", async () => {
      await createWorktreeDirectory("ws-abc");
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("ws-abc"),
        { recursive: true },
      );
    });

    it("respects an explicit parentPath argument", async () => {
      const customParent = path.join(FAKE_CWD, "subdir");
      const result = await createWorktreeDirectory("ws-sub", customParent);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toContain("subdir");
    });

    it("rejects traversal via parentPath outside project root", async () => {
      // Sanitizer normalizes the workspaceId, so traversal must come from parentPath.
      // Passing an absolute path outside cwd causes the worktree path to escape the project root.
      const result = await createWorktreeDirectory("ws-123", "/tmp/attack");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/traversal/i);
    });

    it("rejects parentPath that points to filesystem root area", async () => {
      const result = await createWorktreeDirectory("ws-999", "/etc");
      expect(result.success).toBe(false);
    });

    it("returns failure when fs.mkdir throws a non-traversal error", async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error("EACCES: permission denied"));
      const result = await createWorktreeDirectory("ws-noperm");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/failed to create/i);
    });

    it("sanitizes workspace id with special chars before creating directory", async () => {
      const result = await createWorktreeDirectory("my workspace");
      expect(result.success).toBe(true);
      if (!result.success) return;
      // Space should be sanitized to underscore
      expect(result.data).toContain("my_workspace");
    });
  });

  // ─── getWorktreePathCandidates ────────────────────────────────────────────────

  describe("getWorktreePathCandidates()", () => {
    it("returns paths of existing worktree subdirectories", async () => {
      const fakeEntries = [
        { name: "ws-abc", isDirectory: () => true },
        { name: "ws-def", isDirectory: () => true },
        { name: "README.md", isDirectory: () => false },
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>;

      mockFs.readdir.mockResolvedValueOnce(fakeEntries);

      const result = await getWorktreePathCandidates(FAKE_CWD);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(2);
      expect(result.data.some((p) => p.endsWith("ws-abc"))).toBe(true);
      expect(result.data.some((p) => p.endsWith("ws-def"))).toBe(true);
    });

    it("excludes non-directory entries", async () => {
      const fakeEntries = [
        { name: "ws-dir", isDirectory: () => true },
        { name: "some-file.txt", isDirectory: () => false },
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>;

      mockFs.readdir.mockResolvedValueOnce(fakeEntries);

      const result = await getWorktreePathCandidates(FAKE_CWD);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(1);
    });

    it("returns empty array when worktrees directory does not exist (ENOENT)", async () => {
      mockFs.readdir.mockRejectedValueOnce(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
      );

      const result = await getWorktreePathCandidates(FAKE_CWD);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([]);
    });

    it("returns failure for non-ENOENT errors", async () => {
      mockFs.readdir.mockRejectedValueOnce(
        Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" }),
      );

      const result = await getWorktreePathCandidates(FAKE_CWD);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toMatch(/failed to list/i);
    });

    it("reads from baseDir/.claude/worktrees/", async () => {
      const customBase = "/custom/base";
      mockFs.readdir.mockResolvedValueOnce([]);

      await getWorktreePathCandidates(customBase);

      expect(mockFs.readdir).toHaveBeenCalledWith(
        path.resolve(customBase, ".claude", "worktrees"),
        expect.objectContaining({ withFileTypes: true }),
      );
    });

    it("returns empty array when worktrees directory has no subdirectories", async () => {
      mockFs.readdir.mockResolvedValueOnce([]);

      const result = await getWorktreePathCandidates(FAKE_CWD);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([]);
    });
  });
});
