import type { MonitorAnalysis } from "@/lib/types";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const TIMEOUT_MS = 8000; // 8초
const MAX_RETRIES = 1; // Secondary 키로 한 번 더

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
};

type ApiKeyStatus = "working" | "failed" | "unknown";

class GeminiClient {
  private primaryKey: string;
  private secondaryKey: string;
  private primaryStatus: ApiKeyStatus = "unknown";
  private secondaryStatus: ApiKeyStatus = "unknown";
  private lastError: string | null = null;
  private failureCount = 0;
  private consecutiveFailures = 0;

  constructor(primaryKey: string, secondaryKey: string) {
    this.primaryKey = primaryKey;
    this.secondaryKey = secondaryKey;
  }

  async analyzeOrchestrationState(state: unknown): Promise<MonitorAnalysis> {
    const prompt = this.buildPrompt(state);

    try {
      // Primary 시도
      const result = await this.callGemini(this.primaryKey, prompt, "primary");
      if (result) {
        this.primaryStatus = "working";
        this.consecutiveFailures = 0;
        return result;
      }
    } catch (err) {
      this.primaryStatus = "failed";
      const error = err instanceof Error ? err.message : String(err);
      console.error("[Hermes] Primary API 실패:", error);
      this.lastError = error;
      this.failureCount++;
      this.consecutiveFailures++;
    }

    // Secondary 시도
    try {
      const result = await this.callGemini(this.secondaryKey, prompt, "secondary");
      if (result) {
        this.secondaryStatus = "working";
        this.consecutiveFailures = 0;
        return result;
      }
    } catch (err) {
      this.secondaryStatus = "failed";
      const error = err instanceof Error ? err.message : String(err);
      console.error("[Hermes] Secondary API 실패:", error);
      this.lastError = error;
      this.failureCount++;
      this.consecutiveFailures++;
    }

    // 모두 실패 → 폴백
    console.warn(
      "[Hermes] 모든 Gemini API 호출 실패, 기본값으로 응답",
      this.lastError
    );
    return this.getFallbackAnalysis();
  }

  private async callGemini(
    apiKey: string,
    prompt: string,
    keyType: "primary" | "secondary"
  ): Promise<MonitorAnalysis | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = (await response.json()) as GeminiResponse;
        throw new Error(
          `Gemini API ${response.status}: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const data = (await response.json()) as GeminiResponse;

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Gemini 응답이 비어있음");
      }

      const text = data.candidates[0].content.parts[0].text;
      return this.parseAnalysis(text);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`${keyType} API 타임아웃 (${TIMEOUT_MS}ms)`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildPrompt(state: unknown): string {
    const stateStr = JSON.stringify(state, null, 2);
    return `당신은 AI 개발 관제실의 오케스트레이션 분석가입니다.

현재 오케스트레이션 상태:
${stateStr}

다음을 한국어로 분석해주세요:

1. **Insights** (3개): 현재 상태에서 주목할 핵심 포인트
2. **Recommendations** (3-5개): 다음 단계에서 취할 조치
3. **Risk Flags** (있으면): 주의해야 할 위험 요소

JSON 형식으로 응답해주세요:
{
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "riskFlags": ["flag1"] 또는 []
}`;
  }

  private parseAnalysis(text: string): MonitorAnalysis {
    try {
      // JSON 블록 추출
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON 파싱 실패");

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : [],
        riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags : [],
        analyzedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("[Hermes] 응답 파싱 실패:", text);
      return this.getFallbackAnalysis();
    }
  }

  private getFallbackAnalysis(): MonitorAnalysis {
    return {
      insights: [
        "API 연결 문제로 기본 분석을 제공합니다",
        "시스템이 정상 작동 중입니다",
        "Gemini API를 재시도하고 있습니다",
      ],
      recommendations: [
        "API 키 상태를 확인해주세요",
        "네트워크 연결을 확인해주세요",
        "몇 초 후 다시 시도해주세요",
      ],
      riskFlags: [
        `⚠️ Hermes API 연결 실패 (${this.consecutiveFailures}회 연속)`,
      ],
      analyzedAt: new Date().toISOString(),
    };
  }

  getStatus() {
    return {
      primary: this.primaryStatus,
      secondary: this.secondaryStatus,
      failureCount: this.failureCount,
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.lastError,
      isHealthy: this.consecutiveFailures < 3,
    };
  }

  resetStatus() {
    this.failureCount = 0;
    this.consecutiveFailures = 0;
    this.lastError = null;
  }
}

// 싱글톤
let geminiClient: GeminiClient | null = null;

export function initGeminiClient(
  primaryKey: string,
  secondaryKey: string
): GeminiClient {
  if (!geminiClient) {
    geminiClient = new GeminiClient(primaryKey, secondaryKey);
  }
  return geminiClient;
}

export function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    const primary = process.env.GEMINI_API_KEY_PRIMARY || "";
    const secondary = process.env.GEMINI_API_KEY_SECONDARY || "";

    if (!primary || !secondary) {
      throw new Error(
        "Gemini API 키가 설정되지 않았습니다 (GEMINI_API_KEY_PRIMARY, GEMINI_API_KEY_SECONDARY)"
      );
    }

    geminiClient = new GeminiClient(primary, secondary);
  }
  return geminiClient;
}
