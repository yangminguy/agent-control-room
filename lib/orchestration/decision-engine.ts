/**
 * Orchestration Decision Engine
 * Phase 40: Full Orchestration Layer
 *
 * 작업 설명을 받아 전체 오케스트레이션 판단(위험도, 에이전트, 실행 방식, 승인 게이트,
 * 파일 경계)을 rule-based로 수행한다. LLM 호출 없이 동작한다.
 */

import { nanoid } from "nanoid";
import type { RiskLevel } from "../types";
import type {
  OrchestrationDecision,
  OrchestrationDecisionInput,
  ExtendedAgentType,
  ExecutionMode,
  FileBoundary,
  ExecutionModeResult,
} from "./types";
import { routeAgent } from "./agent-router";
import { buildApprovalGate } from "./approval-gate-builder";
import { detectFileConflict } from "./scheduling-mode-selector";

// ─── Risk Classification ────────────────────────────────────────────────────

const CRITICAL_KEYWORDS = [
  "runner", "approval token", "child_process", ".env", "deploy", "migration",
  "git push", "auto-merge", "authentication", "authorization", "database",
  "package.json", "package-lock", "yarn.lock", "production", "secret", "credential",
  "spawn", "db migration", "auth middleware",
];

const HIGH_KEYWORDS = [
  "architecture", "refactor", "integration", "api contract", "data model",
  "schema", "type system", "middleware", "orchestration", "security", "permission",
  "shared type", "core library",
];

const MEDIUM_KEYWORDS = [
  "feature", "implementation", "adapter", "ui integration", "api route",
  "component", "hook", "service", "endpoint", "business logic",
];

const LOW_KEYWORDS = [
  "docs", "documentation", "readme", "comment", "isolated ui", "test",
  "qa", "read-only", "style", "typo", "translation",
];

function classifyRiskLevel(
  title: string,
  description: string,
  filePaths?: string[]
): { riskLevel: RiskLevel; riskReasonings: string[] } {
  const combined = `${title} ${description} ${(filePaths ?? []).join(" ")}`.toLowerCase();
  const reasonings: string[] = [];

  const matchedCritical = CRITICAL_KEYWORDS.filter((k) => combined.includes(k));
  if (matchedCritical.length > 0) {
    reasonings.push(`Critical 키워드 감지: ${matchedCritical.join(", ")}`);
    return { riskLevel: "critical", riskReasonings: reasonings };
  }

  const matchedHigh = HIGH_KEYWORDS.filter((k) => combined.includes(k));
  if (matchedHigh.length > 0) {
    reasonings.push(`High 위험 키워드 감지: ${matchedHigh.join(", ")}`);
    return { riskLevel: "high", riskReasonings: reasonings };
  }

  const matchedMedium = MEDIUM_KEYWORDS.filter((k) => combined.includes(k));
  if (matchedMedium.length > 0) {
    reasonings.push(`Medium 위험 키워드 감지: ${matchedMedium.join(", ")}`);
    return { riskLevel: "medium", riskReasonings: reasonings };
  }

  const matchedLow = LOW_KEYWORDS.filter((k) => combined.includes(k));
  if (matchedLow.length > 0) {
    reasonings.push(`Low 위험 키워드 감지: ${matchedLow.join(", ")}`);
    return { riskLevel: "low", riskReasonings: reasonings };
  }

  reasonings.push("명확한 위험 패턴 미감지. 기본값 medium으로 안전하게 설정.");
  return { riskLevel: "medium", riskReasonings: reasonings };
}

// ─── Execution Mode Selection ────────────────────────────────────────────────

const TOKEN_LIMITED_STATUSES = ["token_limited", "context_overloaded", "cooling_down"];

function selectExecutionMode(
  riskLevel: RiskLevel,
  primaryAgent: ExtendedAgentType,
  currentAgentStatus?: string,
  filePaths?: string[]
): ExecutionModeResult {
  const hasFileConflict = detectFileConflict(filePaths ?? []);

  // token/context 문제 → 릴레이
  if (currentAgentStatus && TOKEN_LIMITED_STATUSES.includes(currentAgentStatus)) {
    return {
      mode: "token_relay",
      parallelAllowed: false,
      parallelBlockReason: `현재 에이전트 상태(${currentAgentStatus})로 인해 릴레이 필요`,
      reasoning: "토큰/컨텍스트 한계로 인해 다음 에이전트에게 Context Pack과 함께 인수인계.",
    };
  }

  // critical → single + manual approval
  if (riskLevel === "critical") {
    return {
      mode: "single_agent",
      parallelAllowed: false,
      parallelBlockReason: "Critical 위험도: 단일 에이전트 수동 승인 필수",
      reasoning: "Critical 위험도 작업은 단일 에이전트, 수동 승인 필수, 자동 실행 금지.",
    };
  }

  // high → single agent
  if (riskLevel === "high") {
    return {
      mode: "single_agent",
      parallelAllowed: false,
      parallelBlockReason: "High 위험도: 단일 에이전트 권장",
      reasoning: "High 위험도 작업은 단일 에이전트로 처리. 완료 후 QA 검토 권장.",
    };
  }

  // Vibe Kanban → workbench handoff
  if (primaryAgent === "vibe-kanban") {
    return {
      mode: "workbench_handoff",
      parallelAllowed: false,
      parallelBlockReason: "Vibe Kanban 워크벤치로 연결",
      reasoning: "장시간 실행 또는 워크스페이스 필요 작업. Vibe Kanban 실행 워크벤치로 연결.",
    };
  }

  // Hermes only → manual handoff (Hermes는 코드 변경 안 함)
  if (primaryAgent === "hermes") {
    return {
      mode: "manual_handoff",
      parallelAllowed: false,
      reasoning: "Hermes는 memory/summary 역할. 코드 변경 없이 노트 생성 후 사용자에게 반환.",
    };
  }

  // medium + file conflict → sequential
  if (riskLevel === "medium" && hasFileConflict) {
    return {
      mode: "sequential_multi_agent",
      parallelAllowed: false,
      parallelBlockReason: `파일 경로 충돌 감지: ${(filePaths ?? []).join(", ")}`,
      reasoning: "Medium 위험도이나 파일 경로 충돌로 순차 실행 필요.",
    };
  }

  // medium + no conflict → sequential (안전 우선)
  if (riskLevel === "medium") {
    return {
      mode: "sequential_multi_agent",
      parallelAllowed: false,
      reasoning: "Medium 위험도: 순차 실행으로 안전하게 처리.",
    };
  }

  // low + no conflict → parallel safe
  if (riskLevel === "low" && !hasFileConflict) {
    return {
      mode: "parallel_safe",
      parallelAllowed: true,
      reasoning: "Low 위험도, 파일 충돌 없음: 병렬 실행 가능.",
    };
  }

  // low + conflict → sequential
  if (riskLevel === "low" && hasFileConflict) {
    return {
      mode: "sequential_multi_agent",
      parallelAllowed: false,
      parallelBlockReason: "Low 위험도이나 파일 경로 충돌 감지",
      reasoning: "파일 충돌로 인해 순차 실행.",
    };
  }

  return {
    mode: "sequential_multi_agent",
    parallelAllowed: false,
    reasoning: "기본 안전 모드: 순차 실행.",
  };
}

// ─── File Boundary Builder ────────────────────────────────────────────────────

const ALWAYS_BLOCKED_FILES = [
  "lib/runner/",
  "lib/orchestration/approval-token-store.ts",
  "app/api/runner/route.ts",
  "app/api/workbench/approval/route.ts",
];

const ALWAYS_BLOCKED_COMMANDS = [
  "git push",
  "git push --force",
  "git merge",
  "npm run deploy",
  "vercel --prod",
  "prisma migrate deploy",
  "prisma db push",
];

function buildFileBoundary(
  riskLevel: RiskLevel,
  filePaths?: string[],
  primaryAgent?: ExtendedAgentType
): FileBoundary {
  const isReadOnly = primaryAgent === "hermes";

  const filesToInspect = filePaths?.length
    ? filePaths
    : ["CLAUDE.md", "docs/ARCHITECTURE.md", "lib/types.ts"];

  const filesAllowedToEdit = isReadOnly ? [] : (filePaths ?? []);

  const additionalBlocked = riskLevel === "critical"
    ? ["app/api/orchestration/dispatch/route.ts", "lib/monitor/"]
    : [];

  return {
    filesToInspect,
    filesAllowedToEdit,
    filesBlockedFromEditing: [...ALWAYS_BLOCKED_FILES, ...additionalBlocked],
    commandsAllowed: isReadOnly
      ? ["cat", "ls", "grep", "find"]
      : ["npm run typecheck", "npm run lint", "npm run test", "npm run build", "git diff", "git status"],
    commandsBlocked: ALWAYS_BLOCKED_COMMANDS,
    doNotDoRules: [
      "runner/approval token 로직을 수정하지 마라",
      "git push, auto-merge, deployment 자동화를 하지 마라",
      "DB migration을 직접 실행하지 마라",
      "외부 paid API를 호출하지 마라",
      ...(riskLevel === "critical" ? ["단일 에이전트만 사용하고 사용자 승인 없이 진행하지 마라"] : []),
    ],
  };
}

// ─── Decision Engine ──────────────────────────────────────────────────────────

function inferTaskType(title: string, description: string): string {
  const combined = `${title} ${description}`.toLowerCase();
  if (combined.includes("test") || combined.includes("qa")) return "testing";
  if (combined.includes("ui") || combined.includes("component") || combined.includes("layout")) return "ui";
  if (combined.includes("api") || combined.includes("route") || combined.includes("endpoint")) return "api";
  if (combined.includes("type") || combined.includes("schema") || combined.includes("model")) return "type-system";
  if (combined.includes("doc") || combined.includes("readme")) return "documentation";
  if (combined.includes("refactor")) return "refactoring";
  if (combined.includes("memory") || combined.includes("summary") || combined.includes("obsidian")) return "memory-export";
  if (combined.includes("deploy") || combined.includes("migration")) return "deployment";
  return "feature-implementation";
}

export function makeOrchestrationDecision(
  input: OrchestrationDecisionInput
): OrchestrationDecision {
  const { title, description, filePaths, taskType, currentAgent, currentAgentStatus } = input;

  const { riskLevel, riskReasonings } = classifyRiskLevel(title, description, filePaths);
  const routing = routeAgent(title, description, riskLevel, filePaths);
  const primaryAgent = routing.primaryAgent;
  const secondaryAgent = routing.secondaryAgent;

  const modeResult = selectExecutionMode(riskLevel, primaryAgent, currentAgentStatus, filePaths);
  const fileBoundary = buildFileBoundary(riskLevel, filePaths, primaryAgent);
  const approvalGate = buildApprovalGate(riskLevel, modeResult.mode);

  const contextPackRecommended =
    riskLevel === "high" ||
    riskLevel === "critical" ||
    modeResult.mode === "token_relay" ||
    modeResult.mode === "sequential_multi_agent";

  const hermesMemoryRecommended =
    riskLevel !== "low" && riskLevel !== "safe";

  const vibeKanbanRecommended =
    modeResult.mode === "workbench_handoff" ||
    (primaryAgent === "vibe-kanban");

  const resolvedTaskType = taskType ?? inferTaskType(title, description);

  const reasoning = [
    ...riskReasonings,
    routing.reasoning,
    modeResult.reasoning,
    contextPackRecommended ? "Context Pack 생성 권장 (위험도 또는 순차 실행)" : "",
    hermesMemoryRecommended ? "Hermes memory 기록 권장" : "",
  ].filter(Boolean);

  let nextAction = "";
  switch (modeResult.mode) {
    case "single_agent":
      nextAction = approvalGate.required
        ? `사용자 승인 후 ${primaryAgent}에게 단일 작업 지시`
        : `${primaryAgent}에게 작업 지시`;
      break;
    case "sequential_multi_agent":
      nextAction = `${primaryAgent} 작업 완료 후 ${secondaryAgent ?? "다음 에이전트"}에게 인수인계`;
      break;
    case "parallel_safe":
      nextAction = `${primaryAgent}와 ${secondaryAgent ?? "보조 에이전트"} 병렬 실행 가능`;
      break;
    case "token_relay":
      nextAction = `Context Pack 생성 후 ${secondaryAgent ?? primaryAgent}에게 릴레이`;
      break;
    case "workbench_handoff":
      nextAction = "Vibe Kanban 워크벤치로 작업 연결";
      break;
    case "manual_handoff":
      nextAction = "사용자가 직접 다음 에이전트에게 전달";
      break;
    case "blocked_user_decision":
      nextAction = "사용자 결정이 필요합니다. 방향을 확정 후 진행하세요.";
      break;
  }

  return {
    taskId: input.taskId ?? nanoid(),
    planId: input.planId,
    title,
    summary: description.slice(0, 200),
    taskType: resolvedTaskType,
    riskLevel,
    executionMode: modeResult.mode,
    primaryAgent,
    secondaryAgent,
    parallelAllowed: modeResult.parallelAllowed,
    parallelBlockReason: modeResult.parallelBlockReason,
    fileBoundary,
    approvalGate,
    contextPackRecommended,
    contextPackReason: contextPackRecommended
      ? "위험도 또는 다중 에이전트 실행으로 인수인계 문서 권장"
      : undefined,
    hermesMemoryRecommended,
    vibeKanbanRecommended,
    nextAction,
    reasoning,
    createdAt: new Date().toISOString(),
    decisionSource: "rule_fallback",
  };
}
