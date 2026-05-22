import {
  HermesValidationRequest,
  HermesValidationResult,
  ValidationConfig,
} from "@/lib/types";

const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enableHermesValidation: true,
  confidenceThreshold: 75,
  autoApproveAboveThreshold: false,
  requiresUserConfirmationForRejects: true,
  loggingLevel: "standard",
};

export interface HermesLLMValidator {
  validateStage(request: HermesValidationRequest): Promise<HermesValidationResult>;
  getConfig(): ValidationConfig;
  setConfig(config: Partial<ValidationConfig>): void;
}

export class DefaultHermesValidator implements HermesLLMValidator {
  private config: ValidationConfig = { ...DEFAULT_VALIDATION_CONFIG };
  private validationCache: Map<string, HermesValidationResult> = new Map();

  async validateStage(
    request: HermesValidationRequest
  ): Promise<HermesValidationResult> {
    const cacheKey = this.getCacheKey(request);
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    try {
      const result = await this.performValidation(request);
      this.validationCache.set(cacheKey, result);
      return result;
    } catch (error) {
      return this.createFallbackValidation(request, error);
    }
  }

  private async performValidation(
    request: HermesValidationRequest
  ): Promise<HermesValidationResult> {
    // Simulate LLM validation (in production, call OpenAI/Claude API)
    // For MVP, use deterministic heuristics based on completion metrics

    const totalCriteria = request.acceptanceCriteria.length;
    const acceptanceCriteriaMatches = request.acceptanceCriteria.filter((criteria) =>
      this.hasEvidenceForCriteria(criteria, request.completedWork)
    ).length;
    const completionRatio = totalCriteria > 0 ? acceptanceCriteriaMatches / totalCriteria : 0;

    let confidenceScore: number;
    let isValid: boolean;
    let suggestedAction: "approve" | "reject" | "manual_review";
    let reasoning: string;
    let risks: string[] = [];

    // Scoring logic
    if (completionRatio >= 0.95) {
      confidenceScore = 95;
      isValid = true;
      suggestedAction = "approve";
      reasoning = "All acceptance criteria have matching completion evidence. Stage is ready for completion review.";
    } else if (completionRatio >= 0.8) {
      confidenceScore = 85;
      isValid = true;
      suggestedAction = "approve";
      reasoning = "Most acceptance criteria have matching evidence (80%+). Minor refinements may be needed post-completion.";
    } else if (completionRatio >= 0.6) {
      confidenceScore = 65;
      isValid = false;
      suggestedAction = "manual_review";
      reasoning = "Partial criteria evidence (60-80%). Recommend manual review before proceeding.";
      risks = ["incomplete_criteria", "potential_edge_cases"];
    } else {
      confidenceScore = 40;
      isValid = false;
      suggestedAction = "reject";
      reasoning = "Low criteria evidence (<60%). Stage should not advance without significant additional work.";
      risks = ["critical_gaps", "missing_deliverables"];
    }

    // Risk detection
    if (request.riskFlags && request.riskFlags.length > 0) {
      risks.push(...request.riskFlags);
      confidenceScore = Math.max(0, confidenceScore - 10);
    }

    return {
      validationId: `validation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      requestId: request.id,
      isValid,
      confidenceScore,
      reasoning,
      suggestedAction,
      risks: risks.length > 0 ? risks : undefined,
      recommendations: this.generateRecommendations(request, isValid),
      timestamp: new Date().toISOString(),
    };
  }

  private generateRecommendations(
    request: HermesValidationRequest,
    isValid: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!isValid) {
      const unmetCriteria = request.acceptanceCriteria.filter(
        (criteria) => !this.hasEvidenceForCriteria(criteria, request.completedWork)
      );

      if (unmetCriteria.length > 0) {
        recommendations.push(`Address unmet criteria: ${unmetCriteria.slice(0, 2).join(", ")}`);
      }

      if (request.contextSummary.includes("error") || request.contextSummary.includes("fail")) {
        recommendations.push("Review error handling and failure scenarios");
      }
    }

    if (request.riskFlags && request.riskFlags.length > 0) {
      recommendations.push("Investigate flagged risks before proceeding");
    }

    if (recommendations.length === 0) {
      recommendations.push("Continue with confidence");
    }

    return recommendations;
  }

  private createFallbackValidation(
    request: HermesValidationRequest,
    error: unknown
  ): HermesValidationResult {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      validationId: `validation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      requestId: request.id,
      isValid: false,
      confidenceScore: 0,
      reasoning: `Validation service error: ${errorMessage}. Defaulting to manual review.`,
      suggestedAction: "manual_review",
      risks: ["validation_service_error"],
      timestamp: new Date().toISOString(),
    };
  }

  private getCacheKey(request: HermesValidationRequest): string {
    return JSON.stringify({
      planId: request.planId,
      stageIndex: request.stageIndex,
      acceptanceCriteria: request.acceptanceCriteria,
      completedWork: request.completedWork,
      contextSummary: request.contextSummary,
      riskFlags: request.riskFlags ?? [],
    });
  }

  private hasEvidenceForCriteria(criteria: string, completedWork: string[]): boolean {
    const criteriaTokens = this.tokenize(criteria);
    if (criteriaTokens.length === 0) return false;

    return completedWork.some((work) => {
      const workTokens = new Set(this.tokenize(work));
      const matched = criteriaTokens.filter((token) => workTokens.has(token)).length;
      const requiredMatches = Math.max(1, Math.ceil(criteriaTokens.length * 0.6));
      return matched >= requiredMatches;
    });
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2);
  }

  getConfig(): ValidationConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clearCache(): void {
    this.validationCache.clear();
  }
}

let globalValidator: HermesLLMValidator | null = null;

export function getHermesValidator(): HermesLLMValidator {
  if (!globalValidator) {
    globalValidator = new DefaultHermesValidator();
  }
  return globalValidator;
}

export function setHermesValidator(validator: HermesLLMValidator): void {
  globalValidator = validator;
}
