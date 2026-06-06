/**
 * Tests for lib/harness/context-harness.ts (PRD §11 / §14.7).
 *
 * selectContextPack is a pure path-selector: it must (a) always include the
 * global rule, (b) include the minimal per-work-type rules + docs, (c) honor
 * explicit domains, and (d) stay deterministic + de-duplicated.
 */

import {
  selectContextPack,
  type ContextDomain,
} from "@/lib/harness/context-harness";

describe("selectContextPack", () => {
  it("always includes the global rule", () => {
    const pack = selectContextPack({ workType: "doc" });
    expect(pack.globalRules).toEqual([".claude/rules/00-global.md"]);
  });

  it("ui work pulls ui + architecture, not acr-runner", () => {
    const pack = selectContextPack({ workType: "ui" });
    expect(pack.pathRules).toContain(".claude/rules/50-ui-playwright.md");
    expect(pack.docsIndex).toContain("docs/index/architecture.md");
    expect(pack.pathRules).not.toContain(".claude/rules/20-acr-runner.md");
  });

  it("acr-runner work pulls runner + worktree + verification + kernel doc", () => {
    const pack = selectContextPack({ workType: "acr-runner" });
    expect(pack.pathRules).toEqual(
      expect.arrayContaining([
        ".claude/rules/20-acr-runner.md",
        ".claude/rules/30-worktree-policy.md",
        ".claude/rules/40-verification-policy.md",
      ]),
    );
    expect(pack.docsIndex).toContain("docs/index/acr-kernel.md");
  });

  it("doc work stays minimal (global rule only, architecture doc)", () => {
    const pack = selectContextPack({ workType: "doc" });
    expect(pack.pathRules).toEqual([]);
    expect(pack.docsIndex).toEqual(["docs/index/architecture.md"]);
  });

  it("explicit domains are merged and de-duplicated", () => {
    const domains: ContextDomain[] = ["nocobase", "nocobase", "db"];
    const pack = selectContextPack({ domains });
    expect(pack.pathRules).toContain(".claude/rules/60-nocobase.md");
    expect(pack.docsIndex).toContain("docs/index/db.md");
    // de-dup: each path appears at most once
    expect(new Set(pack.pathRules).size).toBe(pack.pathRules.length);
    expect(new Set(pack.docsIndex).size).toBe(pack.docsIndex.length);
  });

  it("workType + extra domains compose", () => {
    const pack = selectContextPack({ workType: "ui", domains: ["api"] });
    expect(pack.pathRules).toContain(".claude/rules/50-ui-playwright.md");
    expect(pack.docsIndex).toContain("docs/index/api.md");
  });

  it("is deterministic for the same input", () => {
    const a = selectContextPack({ workType: "agent" });
    const b = selectContextPack({ workType: "agent" });
    expect(a).toEqual(b);
  });
});
