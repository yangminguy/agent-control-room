/**
 * Hermes LLM Client — unified bridge to the Hermes CLI (gpt-4o based).
 *
 * Reuses `runHermesCli()` from `lib/hermes-cli` to send structured prompts to
 * the local Hermes binary in non-interactive quiet mode, then parses and
 * Zod-validates the JSON response. Every method degrades to a deterministic
 * fallback when the CLI fails, times out, or returns unparseable output.
 *
 * Hermes is an approval-based background worker — this client performs analysis,
 * validation, packet drafting, insight extraction, routing, and prompt review
 * only. It never triggers code execution.
 */

import { z } from "zod";

import {
  runHermesCli,
  type HermesCliEvent,
  type HermesCliResult,
} from "@/lib/hermes-cli";
import type {
  MonitorAnalysis,
  MonitorValidationRequest,
  MonitorValidationResult,
  AgentResult,
  ExecutionLog,
} from "@/lib/types";
import type { MonitorPacket, MonitorPacketKind, MonitorSection } from "./types";
import type { ExtractedInsight, InsightType } from "./insight-extractor";
import type { RoutingScore } from "./routing-recommendation";
import type { PromptPattern } from "./prompt-improvement-suggestion";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const analysisSchema = z.object({
  insights: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  riskFlags: z.array(z.string()).default([]),
});

const validationSchema = z.object({
  isValid: z.boolean(),
  confidenceScore: z.number().min(0).max(100),
  reasoning: z.string(),
  suggestedAction: z.enum(["approve", "reject", "manual_review"]),
  risks: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

const sectionSchema = z.object({
  title: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  body: z.string(),
  format: z.enum(["markdown", "code", "checklist"]).default("markdown"),
});

const packetSchema = z.object({
  title: z.string(),
  description: z.string().default(""),
  sections: z.array(sectionSchema).default([]),
});

const insightTypeEnum = z.enum([
  "decision",
  "change",
  "pass",
  "fail",
  "risk",
  "pattern",
]);

const insightSchema = z.object({
  type: insightTypeEnum,
  title: z.string(),
  description: z.string(),
  evidence: z.string().default(""),
});

const insightsSchema = z.object({
  insights: z.array(insightSchema).default([]),
});

const agentTypeEnum = z.enum(["claude-code", "codex", "antigravity"]);

const routingScoreSchema = z.object({
  agent: agentTypeEnum,
  recommendationScore: z.number().min(0).max(100),
  reasoning: z.string(),
});

const routingSchema = z.object({
  scores: z.array(routingScoreSchema).default([]),
});

const resultStatusEnum = z.enum([
  "pass",
  "minor_fix",
  "qa_needed",
  "blocked",
  "safety_violation",
]);

const promptPatternSchema = z.object({
  pattern: z.string(),
  frequency: z.number().int().nonnegative().default(1),
  associatedResultStatus: resultStatusEnum,
  suggestion: z.string(),
});

const promptPatternsSchema = z.object({
  patterns: z.array(promptPatternSchema).default([]),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

type CliStatus = "working" | "failed" | "unknown";

/** Extract the first balanced JSON object from arbitrary CLI text. */
function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

// ── Client ────────────────────────────────────────────────────────────────────

class HermesLLMClient {
  private status: CliStatus = "unknown";
  private lastError: string | null = null;
  private failureCount = 0;
  private consecutiveFailures = 0;

  /**
   * Send a prompt to the Hermes CLI and parse + validate its JSON response
   * against `schema`. Returns null on any failure (callers supply fallbacks).
   */
  private async callAndParse<S extends z.ZodTypeAny>(
    prompt: string,
    schema: S,
  ): Promise<z.infer<S> | null> {
    let result: HermesCliResult;
    try {
      result = await runHermesCli(prompt);
    } catch (err) {
      this.recordFailure(err instanceof Error ? err.message : String(err));
      return null;
    }

    if (!result.ok) {
      this.recordFailure(
        result.timedOut
          ? "Hermes CLI 타임아웃"
          : `Hermes CLI 종료 코드 ${result.exitCode ?? "null"}: ${result.stderr.trim()}`,
      );
      return null;
    }

    const json = extractJsonObject(result.stdout);
    if (!json) {
      this.recordFailure("Hermes CLI 응답에서 JSON을 찾지 못함");
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      this.recordFailure("Hermes CLI JSON 파싱 실패");
      return null;
    }

    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      this.recordFailure(`Zod 검증 실패: ${validated.error.message}`);
      return null;
    }

    this.recordSuccess();
    return validated.data;
  }

  private recordSuccess() {
    this.status = "working";
    this.consecutiveFailures = 0;
  }

  private recordFailure(message: string) {
    this.status = "failed";
    this.lastError = message;
    this.failureCount++;
    this.consecutiveFailures++;
    console.error("[Hermes CLI]", message);
  }

  // ── 1. Orchestration state analysis ──────────────────────────────────────

  async analyzeOrchestrationState(state: unknown): Promise<MonitorAnalysis> {
    const prompt = `당신은 AI 개발 관제실의 오케스트레이션 분석가입니다.

현재 오케스트레이션 상태(JSON):
${JSON.stringify(state, null, 2)}

다음을 한국어로 분석하세요:
1. insights (3개): 현재 상태에서 주목할 핵심 포인트
2. recommendations (3-5개): 다음 단계 조치
3. riskFlags (있으면): 주의해야 할 위험 요소

마크다운 코드 블록 없이 JSON 객체로만 응답하세요:
{"insights":["..."],"recommendations":["..."],"riskFlags":["..."]}`;

    const parsed = await this.callAndParse(prompt, analysisSchema);
    if (!parsed) return this.fallbackAnalysis();

    return {
      insights: parsed.insights,
      recommendations: parsed.recommendations,
      riskFlags: parsed.riskFlags,
      analyzedAt: new Date().toISOString(),
    };
  }

  // ── 2. Completion validation ─────────────────────────────────────────────

  async validateCompletion(
    request: MonitorValidationRequest,
  ): Promise<MonitorValidationResult> {
    const prompt = `당신은 AI 개발 관제실의 완료 검증 담당자입니다.

단계: ${request.stageName} (index ${request.stageIndex})
인수 기준(acceptanceCriteria):
${request.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}

완료된 작업(completedWork):
${request.completedWork.map((w) => `- ${w}`).join("\n")}

컨텍스트 요약: ${request.contextSummary}
위험 플래그: ${(request.riskFlags ?? []).join(", ") || "없음"}

인수 기준 충족 여부를 평가하고, 마크다운 코드 블록 없이 JSON으로만 응답하세요:
{"isValid":true,"confidenceScore":0,"reasoning":"...","suggestedAction":"approve","risks":["..."],"recommendations":["..."]}
suggestedAction은 "approve" | "reject" | "manual_review" 중 하나입니다.`;

    const parsed = await this.callAndParse(prompt, validationSchema);
    const timestamp = new Date().toISOString();
    const validationId = `val-${Date.now()}`;

    if (!parsed) {
      return {
        validationId,
        requestId: request.id,
        isValid: false,
        confidenceScore: 0,
        reasoning:
          "Hermes CLI 검증을 수행하지 못했습니다. 수동 검토가 필요합니다.",
        suggestedAction: "manual_review",
        risks: ["Hermes CLI 연결 실패"],
        recommendations: ["CLI 상태를 확인한 뒤 재시도하세요."],
        timestamp,
      };
    }

    return {
      validationId,
      requestId: request.id,
      isValid: parsed.isValid,
      confidenceScore: parsed.confidenceScore,
      reasoning: parsed.reasoning,
      suggestedAction: parsed.suggestedAction,
      risks: parsed.risks,
      recommendations: parsed.recommendations,
      timestamp,
    };
  }

  // ── 3. Packet generation ─────────────────────────────────────────────────

  async generatePacket(
    kind: MonitorPacketKind,
    context: unknown,
  ): Promise<MonitorPacket> {
    const prompt = `당신은 Hermes 백그라운드 워커입니다. "${kind}" 종류의 패킷 초안을 작성하세요.

컨텍스트(JSON):
${JSON.stringify(context, null, 2)}

마크다운 코드 블록 없이 JSON으로만 응답하세요:
{"title":"...","description":"...","sections":[{"title":"...","level":2,"body":"...","format":"markdown"}]}`;

    const parsed = await this.callAndParse(prompt, packetSchema);
    const now = new Date().toISOString();
    const id = `${kind}-${Date.now()}`;

    if (!parsed) {
      return this.fallbackPacket(kind, id, now);
    }

    const sections: MonitorSection[] = parsed.sections.map((s, i) => ({
      id: `${id}-s${i}`,
      title: s.title,
      level: s.level,
      body: s.body,
      format: s.format,
    }));

    return {
      id,
      kind,
      title: parsed.title,
      description: parsed.description,
      createdAt: now,
      updatedAt: now,
      content: { sections },
    };
  }

  // ── 4. Insight extraction ────────────────────────────────────────────────

  async extractInsights(logs: ExecutionLog[]): Promise<ExtractedInsight[]> {
    const compact = logs.map((log) => ({
      id: log.id,
      agent: log.agent,
      status: log.status,
      exitCode: log.exitCode,
      logTail: log.logLines.slice(-20),
    }));

    const prompt = `당신은 Hermes 인사이트 추출기입니다. 아래 실행 로그에서 개발 인사이트를 추출하세요.

실행 로그(JSON):
${JSON.stringify(compact, null, 2)}

각 인사이트 type은 "decision" | "change" | "pass" | "fail" | "risk" | "pattern" 중 하나입니다.
마크다운 코드 블록 없이 JSON으로만 응답하세요:
{"insights":[{"type":"pass","title":"...","description":"...","evidence":"..."}]}`;

    const parsed = await this.callAndParse(prompt, insightsSchema);
    const extractedAt = new Date().toISOString();

    if (!parsed) return [];

    return parsed.insights.map((i) => ({
      type: i.type as InsightType,
      title: i.title,
      description: i.description,
      evidence: i.evidence,
      extractedAt,
    }));
  }

  // ── 5. Routing recommendation ────────────────────────────────────────────

  async recommendRouting(
    results: AgentResult[],
    context: string,
  ): Promise<RoutingScore[]> {
    const compact = results.map((r) => ({
      agent: r.agentId,
      resultStatus: r.resultStatus,
      summary: r.extractedSummary,
    }));

    const prompt = `당신은 Hermes 라우팅 추천기입니다. 다음 작업 컨텍스트와 에이전트 성과 이력을 보고 다음 작업에 적합한 에이전트를 추천하세요.

작업 컨텍스트: ${context}

에이전트 성과 이력(JSON):
${JSON.stringify(compact, null, 2)}

agent는 "claude-code" | "codex" | "antigravity" 중 하나, recommendationScore는 0-100 입니다.
마크다운 코드 블록 없이 JSON으로만 응답하세요:
{"scores":[{"agent":"claude-code","recommendationScore":0,"reasoning":"..."}]}`;

    const parsed = await this.callAndParse(prompt, routingSchema);
    if (!parsed) return [];
    return parsed.scores;
  }

  // ── 6. Prompt improvement ────────────────────────────────────────────────

  async suggestPromptImprovement(
    results: AgentResult[],
  ): Promise<PromptPattern[]> {
    const compact = results.map((r) => ({
      agent: r.agentId,
      resultStatus: r.resultStatus,
      summary: r.extractedSummary,
      output: r.rawOutput.slice(0, 500),
    }));

    const prompt = `당신은 Hermes 프롬프트 개선 분석기입니다. 반복적으로 minor_fix/blocked를 유발하는 프롬프트 패턴을 찾아 개선안을 제시하세요.

에이전트 결과(JSON):
${JSON.stringify(compact, null, 2)}

associatedResultStatus는 "pass" | "minor_fix" | "qa_needed" | "blocked" | "safety_violation" 중 하나입니다.
마크다운 코드 블록 없이 JSON으로만 응답하세요:
{"patterns":[{"pattern":"...","frequency":1,"associatedResultStatus":"minor_fix","suggestion":"..."}]}`;

    const parsed = await this.callAndParse(prompt, promptPatternsSchema);
    if (!parsed) return [];
    return parsed.patterns;
  }

  // ── Fallbacks ────────────────────────────────────────────────────────────

  private fallbackAnalysis(): MonitorAnalysis {
    return {
      insights: [
        "Hermes CLI 연결 문제로 기본 분석을 제공합니다",
        "시스템 상태는 마지막 알려진 값을 기준으로 합니다",
        "Hermes CLI를 재시도할 수 있습니다",
      ],
      recommendations: [
        "hermes 바이너리 설치/PATH를 확인하세요",
        "~/.hermes 설정과 인증을 확인하세요",
        "잠시 후 다시 시도하세요",
      ],
      riskFlags: [
        `⚠️ Hermes CLI 연결 실패 (${this.consecutiveFailures}회 연속)`,
      ],
      analyzedAt: new Date().toISOString(),
    };
  }

  private fallbackPacket(
    kind: MonitorPacketKind,
    id: string,
    now: string,
  ): MonitorPacket {
    return {
      id,
      kind,
      title: `${kind} (fallback)`,
      description: "Hermes CLI 실패로 기본 패킷을 생성했습니다.",
      createdAt: now,
      updatedAt: now,
      content: {
        sections: [
          {
            id: `${id}-s0`,
            title: "상태",
            level: 2,
            body: "Hermes CLI 호출에 실패하여 내용을 생성하지 못했습니다. CLI 상태를 확인한 뒤 다시 시도하세요.",
            format: "markdown",
          },
        ],
      },
    };
  }

  // ── Status ───────────────────────────────────────────────────────────────

  getStatus() {
    return {
      cli: this.status,
      failureCount: this.failureCount,
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.lastError,
      isHealthy: this.consecutiveFailures < 3,
    };
  }

  resetStatus() {
    this.status = "unknown";
    this.failureCount = 0;
    this.consecutiveFailures = 0;
    this.lastError = null;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let hermesLLMClient: HermesLLMClient | null = null;

export function getHermesLLMClient(): HermesLLMClient {
  if (!hermesLLMClient) {
    hermesLLMClient = new HermesLLMClient();
  }
  return hermesLLMClient;
}

export { HermesLLMClient };
export type { HermesCliEvent, HermesCliResult };
