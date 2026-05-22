import {
  MonitorValidationRequest,
  MonitorValidationResult,
  ValidationConfig,
} from "@/lib/types";
import { getHermesLLMClient } from "./hermes-llm-client";

const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enableHermesValidation: true,
  confidenceThreshold: 75,
  autoApproveAboveThreshold: false,
  requiresUserConfirmationForRejects: true,
  loggingLevel: "standard",
};

export interface MonitorLLMValidator {
  validateStage(request: MonitorValidationRequest): Promise<MonitorValidationResult>;
  getConfig(): ValidationConfig;
  setConfig(config: Partial<ValidationConfig>): void;
}

export class DefaultMonitorValidator implements MonitorLLMValidator {
  private config: ValidationConfig = { ...DEFAULT_VALIDATION_CONFIG };
  private validationCache: Map<string, MonitorValidationResult> = new Map();

  async validateStage(
    request: MonitorValidationRequest
  ): Promise<MonitorValidationResult> {
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
    request: MonitorValidationRequest
  ): Promise<MonitorValidationResult> {
    // Delegate to HermesLLMClient: compares acceptance criteria and returns a confidence score.
    // Falls back to heuristics automatically when the API key is unavailable.
    const client = getHermesLLMClient();
    return client.validateCompletion(request);
  }

  private createFallbackValidation(
    request: MonitorValidationRequest,
    error: unknown
  ): MonitorValidationResult {
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

  private getCacheKey(request: MonitorValidationRequest): string {
    return JSON.stringify({
      planId: request.planId,
      stageIndex: request.stageIndex,
      acceptanceCriteria: request.acceptanceCriteria,
      completedWork: request.completedWork,
      contextSummary: request.contextSummary,
      riskFlags: request.riskFlags ?? [],
    });
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

let globalValidator: MonitorLLMValidator | null = null;

export function getMonitorValidator(): MonitorLLMValidator {
  if (!globalValidator) {
    globalValidator = new DefaultMonitorValidator();
  }
  return globalValidator;
}

export function setMonitorValidator(validator: MonitorLLMValidator): void {
  globalValidator = validator;
}
