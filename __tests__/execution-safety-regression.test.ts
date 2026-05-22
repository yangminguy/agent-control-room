import fs from "fs";
import os from "os";
import path from "path";
import { createHash } from "crypto";
import { compileSeniorDevPrompt } from "@/lib/prompts/senior-dev-prompt-compiler";
import {
  issueApprovalToken,
  validateAndConsumeApprovalToken,
  resetTokenStore,
} from "@/lib/orchestration/approval-token-store";
import { POST as approveWorkbenchExecution } from "@/app/api/workbench/approval/route";
import {
  checkUncommittedChanges,
  createBranch,
  generateBranchName,
  validateCwdSafety,
} from "@/lib/runner/git-utils";

const root = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function exists(filePath: string): boolean {
  return fs.existsSync(path.join(root, filePath));
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const approvalFixture = {
  prompt: "Implement the exact approved task.",
  projectPath: root,
  plan: {
    id: "plan-approval-test",
    projectId: "agent-control-room",
    tasks: [
      {
        id: "task-approval-test",
        assignedAgent: "claude-code",
        generatedPrompt: "Implement the exact approved task.",
      },
    ],
  },
  project: {
    id: "agent-control-room",
    path: root,
  },
};

async function loadMockedApprovalRoute() {
  jest.resetModules();
  jest.doMock("@/lib/storage/feature-plan-store", () => ({
    getFeaturePlanById: jest.fn(async (planId: string) =>
      planId === approvalFixture.plan.id ? approvalFixture.plan : undefined,
    ),
  }));
  jest.doMock("@/lib/storage/json-store", () => ({
    getProjects: jest.fn(async () => [approvalFixture.project]),
  }));

  const route = await import("@/app/api/workbench/approval/route");
  const tokenStore = await import("@/lib/orchestration/approval-token-store");
  tokenStore.resetTokenStore();
  return { approveWorkbenchExecution: route.POST, tokenStore };
}

function makeApprovalRequest(overrides: Record<string, unknown> = {}): Request {
  const task = approvalFixture.plan.tasks[0];
  const body = {
    planId: approvalFixture.plan.id,
    taskId: task.id,
    agent: task.assignedAgent,
    cwd: approvalFixture.project.path,
    approvalChecklist: {
      riskAck: true,
      forbiddenFiles: true,
      verifyCommands: true,
      finalApproval: true,
    },
    approvalStatement: "I approve local execution for this exact task",
    promptHash: sha256(task.generatedPrompt),
    ...overrides,
  };

  return new Request("http://localhost/api/workbench/approval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loadMockedRunnerRoute() {
  jest.resetModules();
  jest.doMock("@/lib/runner/spawn-runner", () => ({
    spawnAgent: jest.fn(async () => {
      throw new Error("spawnAgent must not be called by rejection tests");
    }),
  }));
  jest.doMock("@/lib/storage/feature-plan-store", () => ({
    getFeaturePlanById: jest.fn(async () => undefined),
    updatePlanTaskStatus: jest.fn(),
  }));
  jest.doMock("@/lib/storage/execution-log-store", () => ({
    addExecutionLog: jest.fn(),
    updateExecutionLog: jest.fn(),
  }));

  const route = await import("@/app/api/runner/route");
  const tokenStore = await import("@/lib/orchestration/approval-token-store");
  const spawnRunner = await import("@/lib/runner/spawn-runner");
  tokenStore.resetTokenStore();
  return { runAgent: route.POST, tokenStore, spawnAgent: spawnRunner.spawnAgent as jest.Mock };
}

function makeRunnerRequest(overrides: Record<string, unknown> = {}): Request {
  const body = {
    planId: "runner-plan",
    taskId: "runner-task",
    prompt: "approved prompt",
    cwd: root,
    agent: "claude-code",
    ...overrides,
  };

  return new Request("http://localhost/api/runner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Execution safety regression guardrails", () => {
  it("keeps the execution safety checklist and QA plan present with required topics", () => {
    const checklist = read("docs/EXECUTION_SAFETY_CHECKLIST.md");
    const qaPlan = read("docs/QA_EXECUTION_MANAGER.md");

    [
      "Approval Gate",
      "Risk Display",
      "Allowed Files",
      "Do-Not-Touch Files",
      "Validation Commands",
      "Dangerous Operation Warnings",
      "API Route Exposure",
      "Runner UI Exposure",
      "Result Review",
      "Retry And Handoff",
      "Roadmap Update",
    ].forEach((topic) => {
      expect(checklist).toContain(topic);
    });

    [
      "Pages To Test",
      "Core User Flows",
      "Unsafe Button Labels",
      "Expected Safe Button Labels",
      "Execution Lifecycle Scenarios",
      "Failure Scenarios",
      "Regression Checks",
      "Mobile Checks",
    ].forEach((topic) => {
      expect(qaPlan).toContain(topic);
    });
  });

  it("keeps /plan as a roadmap control surface without direct runner wiring", () => {
    const planPage = read("app/plan/page.tsx");
    const planSurface = planPage;

    expect(planPage).toContain("Control Tower");
    expect(planPage).toContain("모든 에이전트는 승인된 범위 내에서만 작동합니다.");
    expect(planSurface).not.toContain("RunnerLogView");
    expect(planSurface).not.toContain('fetch("/api/runner"');

    ["Auto Run", "Auto Execute", "Deploy", "Auto Merge"].forEach((unsafeLabel) => {
      expect(planSurface).not.toContain(unsafeLabel);
    });

    expect(planSurface).toContain("Vibe Kanban");
    expect(planSurface).toContain("Hermes");
    expect(read("components/roadmap/RoadmapStageCard.tsx")).toContain("완료 기준");
  });

  it("keeps the controlled runner backend available behind approval tokens", () => {
    expect(exists("app/api/runner/route.ts")).toBe(true);
    expect(exists("lib/runner/spawn-runner.ts")).toBe(true);
    expect(exists("lib/runner/git-utils.ts")).toBe(true);
    expect(exists("lib/storage/execution-log-store.ts")).toBe(true);

    const runnerRoute = read("app/api/runner/route.ts");

    expect(runnerRoute).toContain('SUPPORTED_RUNNER_AGENTS = new Set(["claude-code", "codex", "antigravity"])');
    expect(runnerRoute).toContain("validateCwdSafety");
    expect(runnerRoute).toContain("checkUncommittedChanges");
    expect(runnerRoute).toContain("createBranch");
    expect(runnerRoute).toContain("approvalToken");
    expect(runnerRoute).toContain("validateAndConsumeApprovalToken");
  });

  it("requires server-issued approval token for /api/runner execution", () => {
    const runnerRoute = read("app/api/runner/route.ts");
    expect(runnerRoute).toContain("approvalToken");
    expect(runnerRoute).toContain("validateAndConsumeApprovalToken");
    expect(runnerRoute).toContain("Invalid, expired, or mismatched approval token");
    expect(runnerRoute).toContain("403");
  });

  it("allows configured local agents only after the workbench approval gate", () => {
    const readinessGate = read("components/workbench/ExecutionReadinessGate.tsx");
    expect(readinessGate).toContain("agentSupported");
    expect(readinessGate).toContain('["claude-code", "codex", "antigravity"].includes(task.assignedAgent)');

    const runPanel = read("components/workbench/WorkbenchRunPanel.tsx");
    expect(runPanel).toContain("approvalToken");
    expect(runPanel).toContain("RunnerLogView");
  });

  it("routes Antigravity through its local IDE CLI instead of manual prompt-copy", () => {
    const adapter = read("lib/dispatch/adapters/antigravity-cli-adapter.ts");

    expect(adapter).toContain("spawn(");
    expect(adapter).toContain("child_process");
    expect(adapter).toContain("antigravity-ide");
    expect(adapter).toContain('"chat", "--mode", "agent"');
  });

  it("validates workbench approval gate requires both auto and manual checks", () => {
    const readinessGate = read("components/workbench/ExecutionReadinessGate.tsx");
    expect(readinessGate).toContain("allAutoChecksPassed");
    expect(readinessGate).toContain("allManualsChecked");
    expect(readinessGate).toContain("gateOpen = allAutoChecksPassed && allManualsChecked");
  });

  it("keeps validation checklist with lint and complete sequence", () => {
    const readinessGate = read("components/workbench/ExecutionReadinessGate.tsx");
    expect(readinessGate).toContain("npm run typecheck");
    expect(readinessGate).toContain("npm run lint");
    expect(readinessGate).toContain("npm run test");
    expect(readinessGate).toContain("npm run build");
    expect(readinessGate).toContain("typecheck && npm run lint && npm run test && npm run build");
  });

  it("keeps prompt compiler flow draft-oriented with safety copy and required sections", async () => {
    const promptPage = read("app/prompt-compiler/page.tsx");
    const promptUI = read("components/prompt-compiler/PromptCompilerUI.tsx");

    expect(promptPage).toContain("without direct execution");
    expect(promptUI).toContain("This page only generates prompt drafts");
    expect(promptUI).toContain("It does not run agents, execute code, deploy, or modify files");
    expect(promptUI).toContain("Generate Prompt Draft");
    expect(promptUI).toContain("Copy Prompt");
    expect(promptUI).toContain("User Approval Required");
    expect(promptUI).toContain("Files Not to Modify");
    expect(promptUI).toContain("Validation Commands");

    const compiled = await compileSeniorDevPrompt({
      projectName: "Agent Control Room",
      projectContext: "AI Development Control Tower with human-approved execution gates.",
      userRequest: "Add regression tests for execution safety copy without touching implementation files.",
      taskTitle: "Execution Safety Regression Tests",
      acceptanceCriteria: [
        "Execution remains gated",
        "Prompt compiler remains copy-ready",
        "Hermes remains draft-only",
      ],
    });

    expect(compiled.generatedPromptMarkdown).toContain("## Allowed Files to Edit");
    expect(compiled.generatedPromptMarkdown).toContain("## Do Not Touch");
    expect(compiled.generatedPromptMarkdown).toContain("## Acceptance Criteria");
    expect(compiled.generatedPromptMarkdown).toContain("## Validation");
    expect(compiled.generatedPromptMarkdown).toContain("## Final Handoff Output");
    expect(compiled.doNotDoRules).toContain("Do not execute agents automatically");
  });

  it("keeps Hermes packets renderable as draft-only artifacts", () => {
    const hermesPage = read("app/hermes-packets/page.tsx");
    const packetCard = read("components/hermes/PacketDraftCard.tsx");
    const packetGenerator = read("lib/monitor/task-packets.ts");

    expect(hermesPage).toContain("Hermes is not executed");
    expect(hermesPage).toContain("packet drafts");
    expect(packetCard).toContain("마크다운 복사");
    expect(packetCard).toContain("JSON 복사");
    expect(packetGenerator).toContain("renderMonitorPacketMarkdown");

    const hermesSurface = `${hermesPage}\n${packetCard}\n${packetGenerator}`;
    expect(hermesSurface).not.toContain('fetch("/api/runner"');
    expect(hermesSurface).not.toContain("spawnAgent");
    expect(hermesSurface).not.toContain("child_process");
  });

  it("checks execution route safety copy if Claude has created the controlled execution page", () => {
    if (!exists("app/execution/page.tsx")) {
      expect(exists("app/execution/page.tsx")).toBe(false);
      return;
    }

    const executionPage = read("app/execution/page.tsx");

    [
      "approval",
      "risk",
      "allowed",
      "do-not-touch",
      "validation",
      "review",
      "handoff",
      "roadmap",
    ].forEach((requiredCopy) => {
      expect(executionPage.toLowerCase()).toContain(requiredCopy);
    });
  });

  it("keeps queue route planning-only with no execution capability", () => {
    const queueRoute = read("app/api/orchestration/queue/route.ts");

    expect(queueRoute).toContain("PLANNING-ONLY");
    expect(queueRoute).toContain("does NOT execute agents");
    expect(queueRoute).not.toContain("spawnAgent");
    expect(queueRoute).not.toContain("createBranch");
    // Check that queue doesn't call runner (not in logic, only in comment is ok)
    const queueRouteWithoutComments = queueRoute.replace(/\/\/.*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(queueRouteWithoutComments).not.toContain("spawn");
    expect(queueRouteWithoutComments).not.toContain("branch");

    const queueLogic = read("lib/orchestration/task-queue.ts");
    expect(queueLogic).not.toContain("spawnAgent");
    expect(queueLogic).not.toContain("fetch");
  });

  it("keeps /workbench behind approval gate for unsupported agents", () => {
    const workbenchPage = read("app/workbench/page.tsx");
    expect(workbenchPage).toContain("ExecutionReadinessGate");

    const readinessGate = read("components/workbench/ExecutionReadinessGate.tsx");
    expect(readinessGate).toContain("agentSupported");
    expect(readinessGate).toContain("allAutoChecksPassed && allManualsChecked");
  });

  it("approval token store issues, validates, and prevents reuse", () => {
    resetTokenStore();

    const context = {
      planId: "test-plan",
      taskId: "test-task",
      agent: "claude-code" as const,
      cwd: "/tmp/test",
    };

    // Issue token
    const token = issueApprovalToken(context);
    expect(token).toMatch(/^appr-\d+-[0-9a-f-]+$/);

    // Valid validation
    const result = validateAndConsumeApprovalToken(token, context);
    expect(result).toEqual(context);

    // Prevent reuse: second validation fails
    const reuse = validateAndConsumeApprovalToken(token, context);
    expect(reuse).toBeNull();
  });

  it("approval token rejects mismatched context", () => {
    resetTokenStore();

    const token = issueApprovalToken({
      planId: "plan-1",
      taskId: "task-1",
      agent: "claude-code",
      cwd: "/tmp/a",
    });

    // Wrong planId
    let result = validateAndConsumeApprovalToken(token, {
      planId: "plan-2",
      taskId: "task-1",
      agent: "claude-code",
      cwd: "/tmp/a",
    });
    expect(result).toBeNull();

    // Issue new token for fresh test
    const token2 = issueApprovalToken({
      planId: "plan-1",
      taskId: "task-1",
      agent: "claude-code",
      cwd: "/tmp/a",
    });

    // Wrong taskId
    result = validateAndConsumeApprovalToken(token2, {
      planId: "plan-1",
      taskId: "task-2",
      agent: "claude-code",
      cwd: "/tmp/a",
    });
    expect(result).toBeNull();

    // Issue new token
    const token3 = issueApprovalToken({
      planId: "plan-1",
      taskId: "task-1",
      agent: "claude-code",
      cwd: "/tmp/a",
    });

    // Wrong agent
    result = validateAndConsumeApprovalToken(token3, {
      planId: "plan-1",
      taskId: "task-1",
      agent: "codex",
      cwd: "/tmp/a",
    });
    expect(result).toBeNull();

    // Issue new token
    const token4 = issueApprovalToken({
      planId: "plan-1",
      taskId: "task-1",
      agent: "claude-code",
      cwd: "/tmp/a",
    });

    // Wrong cwd
    result = validateAndConsumeApprovalToken(token4, {
      planId: "plan-1",
      taskId: "task-1",
      agent: "claude-code",
      cwd: "/tmp/b",
    });
    expect(result).toBeNull();
  });

  it("approval token rejects forged tokens", () => {
    resetTokenStore();

    // Attempt to use forged token
    const forged = "appr-1234567890-fake";
    const result = validateAndConsumeApprovalToken(forged, {
      planId: "test-plan",
      taskId: "test-task",
      agent: "claude-code",
      cwd: "/tmp/test",
    });
    expect(result).toBeNull();
  });

  it("approval token workbench API validates request", () => {
    const approvalRoute = read("app/api/workbench/approval/route.ts");

    expect(approvalRoute).toContain("issueApprovalToken");
    expect(approvalRoute).toContain("getFeaturePlanById");
    expect(approvalRoute).toContain("getProjects");
    expect(approvalRoute).toContain("promptHash");
    expect(approvalRoute).toContain("approvalChecklist");
    expect(approvalRoute).toContain("APPROVAL_STATEMENT");
    expect(approvalRoute).toContain("planId");
    expect(approvalRoute).toContain("taskId");
    expect(approvalRoute).toContain("agent");
    expect(approvalRoute).toContain("cwd");
    expect(approvalRoute).toContain("SUPPORTED_AGENTS");
    expect(approvalRoute).toContain("approvalToken");
    expect(approvalRoute).toContain("expiresIn");
  });

  it("rejects direct forged approval POST without completed approval proof", async () => {
    const { approveWorkbenchExecution, tokenStore } = await loadMockedApprovalRoute();
    const task = approvalFixture.plan.tasks[0];

    const response = await approveWorkbenchExecution(new Request("http://localhost/api/workbench/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: approvalFixture.plan.id,
        taskId: task.id,
        agent: task.assignedAgent,
        cwd: approvalFixture.project.path,
      }),
    }));

    expect(response.status).toBe(403);
    expect(tokenStore.getTokenCount()).toBe(0);
  });

  it("approval API rejects missing or incorrect approval statements and malformed JSON", async () => {
    const { approveWorkbenchExecution, tokenStore } = await loadMockedApprovalRoute();

    const missingStatement = await approveWorkbenchExecution(makeApprovalRequest({ approvalStatement: undefined }));
    expect(missingStatement.status).toBe(403);

    const incorrectStatement = await approveWorkbenchExecution(makeApprovalRequest({
      approvalStatement: "I approve something else",
    }));
    expect(incorrectStatement.status).toBe(403);

    const malformed = await approveWorkbenchExecution(new Request("http://localhost/api/workbench/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    }));
    expect(malformed.status).toBe(500);

    expect(tokenStore.getTokenCount()).toBe(0);
  });

  it("approval API rejects missing prompt hash and incomplete checklist variations", async () => {
    const { approveWorkbenchExecution, tokenStore } = await loadMockedApprovalRoute();

    const missingPromptHash = await approveWorkbenchExecution(makeApprovalRequest({ promptHash: undefined }));
    expect(missingPromptHash.status).toBe(403);

    const incompleteChecklist = await approveWorkbenchExecution(makeApprovalRequest({
      approvalChecklist: {
        riskAck: true,
        forbiddenFiles: true,
        verifyCommands: true,
        finalApproval: false,
      },
    }));
    expect(incompleteChecklist.status).toBe(403);

    expect(tokenStore.getTokenCount()).toBe(0);
  });

  it("rejects invalid plan, task, cwd, and agent approval combinations", async () => {
    const { approveWorkbenchExecution, tokenStore } = await loadMockedApprovalRoute();

    const invalidPlan = await approveWorkbenchExecution(makeApprovalRequest({ planId: "missing-plan" }));
    expect(invalidPlan.status).toBe(404);

    const invalidTask = await approveWorkbenchExecution(makeApprovalRequest({ taskId: "missing-task" }));
    expect(invalidTask.status).toBe(404);

    const invalidCwd = await approveWorkbenchExecution(makeApprovalRequest({ cwd: os.tmpdir() }));
    expect(invalidCwd.status).toBe(403);

    const mismatchedAgent = await approveWorkbenchExecution(makeApprovalRequest({ agent: "codex" }));
    expect(mismatchedAgent.status).toBe(403);

    const badPrompt = await approveWorkbenchExecution(makeApprovalRequest({ promptHash: sha256("different prompt") }));
    expect(badPrompt.status).toBe(403);

    expect(tokenStore.getTokenCount()).toBe(0);
  });

  it("mints approval token only for exact plan/task/agent/cwd/prompt context", async () => {
    const { approveWorkbenchExecution, tokenStore } = await loadMockedApprovalRoute();
    const task = approvalFixture.plan.tasks[0];

    const response = await approveWorkbenchExecution(makeApprovalRequest());
    const body = await response.json() as { approvalToken?: string; success?: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.approvalToken).toMatch(/^appr-\d+-[0-9a-f-]+$/);

    const wrongContext = tokenStore.validateAndConsumeApprovalToken(body.approvalToken || "", {
      planId: approvalFixture.plan.id,
      taskId: task.id,
      agent: "claude-code",
      cwd: `${approvalFixture.project.path}/not-the-approved-cwd`,
    });
    expect(wrongContext).toBeNull();

    const correctContext = tokenStore.validateAndConsumeApprovalToken(body.approvalToken || "", {
      planId: approvalFixture.plan.id,
      taskId: task.id,
      agent: "claude-code",
      cwd: approvalFixture.project.path,
    });
    expect(correctContext).toEqual({
      planId: approvalFixture.plan.id,
      taskId: task.id,
      agent: "claude-code",
      cwd: approvalFixture.project.path,
    });

    const reuse = tokenStore.validateAndConsumeApprovalToken(body.approvalToken || "", {
      planId: approvalFixture.plan.id,
      taskId: task.id,
      agent: "claude-code",
      cwd: approvalFixture.project.path,
    });
    expect(reuse).toBeNull();
  });

  it("approval token rejects expired tokens", () => {
    resetTokenStore();
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_000);

    const token = issueApprovalToken({
      planId: "plan-expiry",
      taskId: "task-expiry",
      agent: "claude-code",
      cwd: "/tmp/expiry",
    });

    nowSpy.mockReturnValue(1_000 + 5 * 60 * 1000 + 1);
    const result = validateAndConsumeApprovalToken(token, {
      planId: "plan-expiry",
      taskId: "task-expiry",
      agent: "claude-code",
      cwd: "/tmp/expiry",
    });

    expect(result).toBeNull();
    nowSpy.mockRestore();
  });

  it("/api/runner validates and consumes approval token", () => {
    const runnerRoute = read("app/api/runner/route.ts");

    expect(runnerRoute).toContain("validateAndConsumeApprovalToken");
    expect(runnerRoute).toContain("tokenContext");
    expect(runnerRoute).toContain("Invalid, expired, or mismatched approval token");
    expect(runnerRoute).not.toContain("startsWith(\"session-\")");
  });

  it("/api/runner rejects missing, forged, expired, reused, and mismatched tokens before spawning", async () => {
    const { runAgent, tokenStore, spawnAgent } = await loadMockedRunnerRoute();

    const missing = await runAgent(makeRunnerRequest());
    expect(missing.status).toBe(403);

    const forged = await runAgent(makeRunnerRequest({ approvalToken: "appr-123-fake" }));
    expect(forged.status).toBe(403);

    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValue(10_000);
    const expiredToken = tokenStore.issueApprovalToken({
      planId: "runner-plan",
      taskId: "runner-task",
      agent: "claude-code",
      cwd: root,
    });
    nowSpy.mockReturnValue(10_000 + tokenStore.TOKEN_TTL_MS + 1);
    const expired = await runAgent(makeRunnerRequest({ approvalToken: expiredToken }));
    expect(expired.status).toBe(403);
    nowSpy.mockRestore();

    const reusableToken = tokenStore.issueApprovalToken({
      planId: "runner-plan",
      taskId: "runner-task",
      agent: "claude-code",
      cwd: root,
    });
    expect(tokenStore.validateAndConsumeApprovalToken(reusableToken, {
      planId: "runner-plan",
      taskId: "runner-task",
      agent: "claude-code",
      cwd: root,
    })).toEqual({
      planId: "runner-plan",
      taskId: "runner-task",
      agent: "claude-code",
      cwd: root,
    });
    const reused = await runAgent(makeRunnerRequest({ approvalToken: reusableToken }));
    expect(reused.status).toBe(403);

    const mismatchedToken = tokenStore.issueApprovalToken({
      planId: "runner-plan",
      taskId: "other-task",
      agent: "claude-code",
      cwd: root,
    });
    const mismatched = await runAgent(makeRunnerRequest({ approvalToken: mismatchedToken }));
    expect(mismatched.status).toBe(403);

    expect(spawnAgent).not.toHaveBeenCalled();
  });

  it("/api/runner accepts supported agent tokens but still validates plan and cwd before spawning", async () => {
    const { runAgent, tokenStore, spawnAgent } = await loadMockedRunnerRoute();

    const codexToken = tokenStore.issueApprovalToken({
      planId: "runner-plan",
      taskId: "runner-task",
      agent: "codex",
      cwd: root,
    });
    const codex = await runAgent(makeRunnerRequest({
      agent: "codex",
      approvalToken: codexToken,
    }));
    expect(codex.status).toBe(404);

    const outsideCwd = os.tmpdir();
    const outsideToken = tokenStore.issueApprovalToken({
      planId: "runner-plan",
      taskId: "runner-task",
      agent: "claude-code",
      cwd: outsideCwd,
    });
    const outside = await runAgent(makeRunnerRequest({
      cwd: outsideCwd,
      approvalToken: outsideToken,
    }));
    expect(outside.status).toBe(403);

    expect(spawnAgent).not.toHaveBeenCalled();
  });

  it("workbench gate displays acceptance criteria", () => {
    const readinessGate = read("components/workbench/ExecutionReadinessGate.tsx");
    expect(readinessGate).toContain("acceptanceCriteria");
    expect(readinessGate).toContain("완료 조건");
  });

  it("RunnerLogView uses server-issued approval token", () => {
    const runnerLogView = read("components/runner/RunnerLogView.tsx");

    expect(runnerLogView).toContain("approvalToken");
    expect(runnerLogView).toContain("approvalToken");
    // Should not generate token client-side
    expect(runnerLogView).not.toContain("session-");
  });

  it("cwd validation rejects symlink escapes outside the allowed project root", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "acr-root-"));
    const allowedRoot = path.join(tempRoot, "allowed");
    const outsideRoot = path.join(tempRoot, "outside");
    const insideDir = path.join(allowedRoot, "inside");
    const symlinkPath = path.join(allowedRoot, "escape");

    fs.mkdirSync(insideDir, { recursive: true });
    fs.mkdirSync(outsideRoot, { recursive: true });
    fs.symlinkSync(outsideRoot, symlinkPath);

    try {
      expect(validateCwdSafety(insideDir, allowedRoot)).toBe(true);
      expect(validateCwdSafety(symlinkPath, allowedRoot)).toBe(false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("git safety helpers fail closed and reject unsafe branch task ids", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "acr-non-git-"));

    try {
      await expect(checkUncommittedChanges(tempRoot)).resolves.toBe(true);
      expect(() => generateBranchName("pt-018;rm-rf")).toThrow("Unsafe branch segment");
      expect(() => generateBranchName("")).toThrow("Unsafe branch segment");
      expect(() => generateBranchName("../pt-018")).toThrow("Unsafe branch segment");
      expect(generateBranchName("pt-018")).toMatch(/^acr\/pt-018-\d{8}-\d{4}$/);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("git branch creation rejects unsafe branch names before shelling out", async () => {
    await expect(createBranch("main;rm-rf", root)).rejects.toThrow("Unsafe branch name");
    await expect(createBranch("", root)).rejects.toThrow("Unsafe branch name");
  });

  it("branch creation avoids shell-interpolated git checkout", () => {
    const gitUtils = read("lib/runner/git-utils.ts");

    expect(gitUtils).toContain("execFileSync");
    expect(gitUtils).toContain('execFileSync("git", ["checkout", "-b", branchName]');
    expect(gitUtils).not.toContain("git checkout -b \\\"");
    expect(gitUtils).not.toContain("git push");
    expect(gitUtils).not.toContain("git merge");
    expect(gitUtils).not.toContain("git branch -D");
  });

  it("local runner mode does not introduce external paid agent API execution", () => {
    const runnerSurface = [
      read("app/api/runner/route.ts"),
      read("lib/runner/spawn-runner.ts"),
      read("components/runner/RunnerLogView.tsx"),
      read("components/workbench/WorkbenchRunPanel.tsx"),
    ].join("\n");

    expect(runnerSurface).toContain("spawn(");
    expect(runnerSurface).toContain('shell: false');
    expect(runnerSurface).not.toContain("OPENAI_API_KEY");
    expect(runnerSurface).not.toContain("ANTHROPIC_API_KEY");
    expect(runnerSurface).not.toContain("api.openai.com");
    expect(runnerSurface).not.toContain("api.anthropic.com");
    expect(runnerSurface).not.toContain("createChatCompletion");
    expect(runnerSurface).not.toContain("responses.create");
  });

  it("context and handoff pack generators are text-only helpers", () => {
    const contextGenerator = read("lib/orchestration/context-pack-generator.ts");
    const handoffGenerator = read("lib/orchestration/handoff-pack-generator.ts");
    const generatorSurface = `${contextGenerator}\n${handoffGenerator}`;

    expect(generatorSurface).toContain("Pure string output");
    expect(generatorSurface).not.toContain("writeFile");
    expect(generatorSurface).not.toContain("spawn");
    expect(generatorSurface).not.toContain("exec");
    expect(generatorSurface).not.toContain("fetch(");
    expect(generatorSurface).not.toContain("git ");
  });
});
