import {
  HermesValidationRequest,
  HermesValidationResult,
  AutoDecisionLog,
} from "@/lib/types";

export interface ValidationStore {
  // Requests
  saveValidationRequest(request: HermesValidationRequest): Promise<void>;
  getValidationRequest(requestId: string): Promise<HermesValidationRequest | null>;
  getAllValidationRequests(): Promise<HermesValidationRequest[]>;

  // Results
  saveValidationResult(result: HermesValidationResult): Promise<void>;
  getValidationResult(validationId: string): Promise<HermesValidationResult | null>;
  getValidationResultsByRequest(requestId: string): Promise<HermesValidationResult[]>;

  // Decisions
  saveAutoDecisionLog(log: AutoDecisionLog): Promise<void>;
  getAutoDecisionLog(decisionId: string): Promise<AutoDecisionLog | null>;
  getAutoDecisionLogsByValidation(validationId: string): Promise<AutoDecisionLog[]>;
}

export class InMemoryValidationStore implements ValidationStore {
  private requests: HermesValidationRequest[] = [];
  private results: HermesValidationResult[] = [];
  private decisions: AutoDecisionLog[] = [];

  // Requests
  async saveValidationRequest(request: HermesValidationRequest): Promise<void> {
    const index = this.requests.findIndex((r) => r.id === request.id);
    if (index >= 0) {
      this.requests[index] = request;
    } else {
      this.requests.push(request);
    }
  }

  async getValidationRequest(requestId: string): Promise<HermesValidationRequest | null> {
    return this.requests.find((r) => r.id === requestId) || null;
  }

  async getAllValidationRequests(): Promise<HermesValidationRequest[]> {
    return [...this.requests];
  }

  // Results
  async saveValidationResult(result: HermesValidationResult): Promise<void> {
    const index = this.results.findIndex((r) => r.validationId === result.validationId);
    if (index >= 0) {
      this.results[index] = result;
    } else {
      this.results.push(result);
    }
  }

  async getValidationResult(validationId: string): Promise<HermesValidationResult | null> {
    return this.results.find((r) => r.validationId === validationId) || null;
  }

  async getValidationResultsByRequest(requestId: string): Promise<HermesValidationResult[]> {
    return this.results.filter((r) => r.requestId === requestId);
  }

  // Decisions
  async saveAutoDecisionLog(log: AutoDecisionLog): Promise<void> {
    const index = this.decisions.findIndex((l) => l.id === log.id);
    if (index >= 0) {
      this.decisions[index] = log;
    } else {
      this.decisions.push(log);
    }
  }

  async getAutoDecisionLog(decisionId: string): Promise<AutoDecisionLog | null> {
    return this.decisions.find((l) => l.id === decisionId) || null;
  }

  async getAutoDecisionLogsByValidation(validationId: string): Promise<AutoDecisionLog[]> {
    return this.decisions.filter((l) => l.validationId === validationId);
  }
}

let globalStore: ValidationStore | null = null;

export function getValidationStore(): ValidationStore {
  if (!globalStore) {
    globalStore = new InMemoryValidationStore();
  }
  return globalStore;
}

export function setValidationStore(store: ValidationStore): void {
  globalStore = store;
}
