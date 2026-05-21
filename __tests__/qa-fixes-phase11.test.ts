import fs from "fs";
import path from "path";
import {
  checkFileBoundaries,
  extractFileBoundariesFromPrompt,
} from "@/lib/runner/file-boundary";
import { generateContextPackMarkdown } from "@/lib/orchestration/context-pack-generator";
import { classifyResult, generateNextActions } from "@/lib/orchestration/result-classifier";
import { compileSeniorDevPrompt } from "@/lib/prompts/senior-dev-prompt-compiler";
import { normalizeWorkspaceResult } from "@/lib/integrations/vibe-kanban-import";
import { POST as importVibeKanbanResult } from "@/app/api/vibe-kanban/import/route";

const root = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

describe("QA hardening fixes", () => {
  it("detects forbidden file changes after runner execution boundaries are known", () => {
    const prompt = [
      "## Allowed Files to Edit",
      "- app/result-review/page.tsx",
      "- components/workbench/**",
      "",
      "## Do Not Touch",
      "- package.json",
      "- supabase/**",
    ].join("\n");

    const boundaries = extractFileBoundariesFromPrompt(prompt);
    const check = checkFileBoundaries(
      [
        "components/workbench/ResultReviewPanel.tsx",
        "package.json",
        "supabase/migrations/20260521_initial_schema.sql",
      ],
      boundaries,
    );

    expect(check.hasViolation).toBe(true);
    expect(check.forbiddenFiles).toEqual([
      "package.json",
      "supabase/migrations/20260521_initial_schema.sql",
    ]);
    expect(check.reason).toContain("not a clean success");
    expect(check.nextAction).toContain("Review the listed files");
  });

  it("runner route records boundary violations as review-blocked instead of clean success", () => {
    const runnerRoute = read("app/api/runner/route.ts");

    expect(runnerRoute).toContain("checkFileBoundaries");
    expect(runnerRoute).toContain("collectChangedFiles");
    expect(runnerRoute).toContain("boundaryViolation");
    expect(runnerRoute).toContain('"boundary_violation"');
    expect(runnerRoute).toContain('"needs_review"');
    expect(runnerRoute).toContain("[REVIEW_BLOCKED] File boundary violation detected");
    expect(runnerRoute).not.toContain("auto-revert");
    expect(runnerRoute).not.toContain("git push");
  });

  it("Context Pack includes all required Token Relay and reset sections", () => {
    const markdown = generateContextPackMarkdown({
      projectName: "Agent Control Room",
      projectSummary: "AI Development Control Tower for non-developer PMs.",
      currentSituation: "Phase 11 QA hardening is in progress.",
      currentPhase: "Phase 11 QA",
      targetAgent: "Codex",
      completedWork: ["Phase 10 QA completed"],
      pendingWork: ["Run final verification"],
      changedFiles: ["lib/orchestration/result-classifier.ts"],
      allowedFiles: ["lib/orchestration/**"],
      doNotTouchFiles: ["package.json"],
      doNotDoRules: ["Do not deploy"],
      importantDecisions: ["Hermes remains background-only"],
      blockers: ["None"],
      userDecisionsNeeded: ["Approve deployment prep later"],
      validationCommands: ["npm run typecheck", "npm test"],
      nextTask: "Finish QA pass",
      acceptanceCriteria: ["All required checks pass"],
      nextSessionPrompt: "Continue final verification.",
      finalHandoffExpectations: ["Report changed files and command results"],
    });

    [
      "## Project Summary",
      "## Current Situation",
      "## Completed Work",
      "## Pending Work",
      "## Current Phase",
      "## Target Agent",
      "## Allowed Files",
      "## Do-Not-Touch Files",
      "## Do-Not-Do Rules",
      "## Blocked Items",
      "## User Decisions Needed",
      "## Validation Commands",
      "## Next-Session Prompt",
      "## Final Handoff Expectations",
    ].forEach((section) => {
      expect(markdown).toContain(section);
    });
  });

  it.each([
    ["completed with failed tests", "Implementation completed, but tests failed in npm test.", "Blocked"],
    ["mostly complete but needs QA", "Mostly complete but needs QA before acceptance.", "QA"],
    ["blocked pending user decision", "Blocked pending user decision on storage strategy.", "Blocked"],
    ["partial implementation", "Partial implementation only; remaining UI not wired.", "MinorFix"],
    ["forbidden file touched", "Boundary violation: forbidden file touched package.json.", "Blocked"],
    ["safety violation", "Safety violation: attempted deployment command.", "Blocked"],
    ["build passed but manual QA needed", "Build passed but manual QA needed for result review.", "QA"],
  ])("classifies %s correctly", (_name, rawResult, expected) => {
    expect(classifyResult(rawResult)).toBe(expected);
  });

  it("blocked next actions ask for a concrete decision and approval", () => {
    const actions = generateNextActions(
      "Blocked",
      "Blocked pending user decision. Boundary violation: forbidden file touched package.json.",
    ).join("\n");

    expect(actions).toContain("Decision needed");
    expect(actions).toContain("Unblock action");
    expect(actions).toContain("Recommended next agent");
    expect(actions).toContain("User approval required: yes");
  });

  it("honors preferredAgent when safe and overrides it for high-risk work", async () => {
    const safe = await compileSeniorDevPrompt({
      projectName: "Agent Control Room",
      projectContext: "Control tower",
      userRequest: "Update documentation copy for the context pack page.",
      preferredAgent: "antigravity",
    });

    expect(safe.targetAgent).toBe("antigravity");
    expect(safe.agentReason).toContain("User preferred");

    const risky = await compileSeniorDevPrompt({
      projectName: "Agent Control Room",
      projectContext: "Control tower",
      userRequest: "Deploy the application to production.",
      preferredAgent: "codex",
    });

    expect(risky.targetAgent).toBe("manual");
    expect(risky.agentReason).toContain("overridden");
    expect(risky.userApprovalRequired).toBe(true);
  });
});

describe("Phase 11 QA guardrails", () => {
  it("Vibe Kanban import remains review-only and does not bypass classification", async () => {
    expect(normalizeWorkspaceResult("Files changed: app/page.tsx")).toBe(
      "## Vibe Kanban Result\n\nFiles changed: app/page.tsx",
    );

    const response = await importVibeKanbanResult(new Request("http://localhost/api/vibe-kanban/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueId: "vibe-123",
        workspaceResult: "Build passed but manual QA needed.",
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviewOnly).toBe(true);
    expect(body.message).toContain("No execution");
    expect(body.rawResult).toContain("## Vibe Kanban Result");

    const importRoute = read("app/api/vibe-kanban/import/route.ts");
    expect(importRoute).not.toContain("updatePlanTaskStatus");
    expect(importRoute).not.toContain("addExecutionLog");
    expect(importRoute).not.toContain("spawnAgent");
  });

  it("Hermes has no execution wiring in production code", () => {
    const hermesSurface = [
      read("lib/hermes/monitoring-layer.ts"),
      read("lib/hermes/insight-extractor.ts"),
      read("lib/hermes/task-packets.ts"),
      read("components/hermes/HermesMonitorPanel.tsx"),
      read("app/hermes-packets/page.tsx"),
    ].join("\n");

    expect(hermesSurface).toContain("Hermes");
    expect(hermesSurface).not.toContain("child_process");
    expect(hermesSurface).not.toContain("spawn(");
    expect(hermesSurface).not.toContain("exec(");
    expect(hermesSurface).not.toContain('fetch("/api/runner"');
  });

  it("Hermes roadmap and deployment checklist keep future execution deployment-gated", () => {
    const hermesRoadmap = read("docs/HERMES_INTEGRATION_ROADMAP.md");
    const deploymentChecklist = read("docs/DEPLOYMENT_CHECKLIST.md");

    expect(hermesRoadmap).toContain("Status:** Analysis + Planning (No Implementation)");
    expect(hermesRoadmap).toContain("CLI invocation | ❌ Not implemented");
    expect(hermesRoadmap).toContain("Autonomous execution | ❌ Not implemented");
    expect(hermesRoadmap).toContain("Decision gate before deployment");

    expect(deploymentChecklist).toContain("Production deployment 승인");
    expect(deploymentChecklist).toContain("마이그레이션 실행");
    expect(deploymentChecklist).toContain("환경 변수");
    expect(deploymentChecklist).not.toContain("Production deployment 완료");
  });
});
