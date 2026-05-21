/**
 * T036 — Vibe Kanban Real Integration
 * Tests: CreateIssueResponse workspaceUrl, MockVibeKanbanClient, and import normalization
 */

import {
  MockVibeKanbanClient,
  HttpVibeKanbanClient,
  type VibeKanbanIssueDraft,
  type CreateIssueResponse,
} from "@/lib/integrations/vibe-kanban";
import { normalizeWorkspaceResult } from "@/lib/integrations/vibe-kanban-import";

const SAMPLE_DRAFT: VibeKanbanIssueDraft = {
  title: "Test Issue",
  description: "Test description",
  priority: "medium",
  project_id: "proj-1",
  status_id: "status-1",
  sort_order: 0,
  extension_metadata: {},
};

// --- CreateIssueResponse type check ---
describe("CreateIssueResponse", () => {
  it("workspaceUrl is optional on success response", () => {
    const res: CreateIssueResponse = { success: true, issueId: "123" };
    expect(res.workspaceUrl).toBeUndefined();
  });

  it("workspaceUrl can be set on success response", () => {
    const res: CreateIssueResponse = {
      success: true,
      issueId: "123",
      workspaceUrl: "http://localhost:3002/workspaces/demo",
    };
    expect(res.workspaceUrl).toBe("http://localhost:3002/workspaces/demo");
  });
});

// --- MockVibeKanbanClient ---
describe("MockVibeKanbanClient.createIssue", () => {
  it("returns success: true with issueId", async () => {
    const client = new MockVibeKanbanClient();
    const result = await client.createIssue(SAMPLE_DRAFT);
    expect(result.success).toBe(true);
    expect(result.issueId).toBeDefined();
  });

  it("returns a mock workspaceUrl", async () => {
    const client = new MockVibeKanbanClient();
    const result = await client.createIssue(SAMPLE_DRAFT);
    expect(result.workspaceUrl).toBe("http://localhost:3002/workspaces/vibe-demo");
  });
});

// --- normalizeWorkspaceResult ---
describe("normalizeWorkspaceResult", () => {
  it("returns empty string for empty input", () => {
    expect(normalizeWorkspaceResult("")).toBe("");
    expect(normalizeWorkspaceResult("   ")).toBe("");
  });

  it("prepends header when content has no markdown heading", () => {
    const result = normalizeWorkspaceResult("Files changed: app/page.tsx");
    expect(result).toBe("## Vibe Kanban Result\n\nFiles changed: app/page.tsx");
  });

  it("does not prepend header when content already starts with #", () => {
    const content = "# My Result\n\nSome content";
    expect(normalizeWorkspaceResult(content)).toBe(content);
  });

  it("does not prepend header when content starts with ##", () => {
    const content = "## Summary\n\nDone";
    expect(normalizeWorkspaceResult(content)).toBe(content);
  });

  it("trims surrounding whitespace", () => {
    const result = normalizeWorkspaceResult("  some result  ");
    expect(result).toBe("## Vibe Kanban Result\n\nsome result");
  });

  it("preserves multi-line content", () => {
    const input = "line 1\nline 2\nline 3";
    const result = normalizeWorkspaceResult(input);
    expect(result).toContain("line 1\nline 2\nline 3");
  });
});
