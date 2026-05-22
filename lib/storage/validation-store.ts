import {
  MonitorValidationRequest,
  MonitorValidationResult,
  AutoDecisionLog,
} from "@/lib/types";

export interface ValidationStore {
  // Requests
  saveValidationRequest(request: MonitorValidationRequest): Promise<void>;
  getValidationRequest(requestId: string): Promise<MonitorValidationRequest | null>;
  getAllValidationRequests(): Promise<MonitorValidationRequest[]>;

  // Results
  saveValidationResult(result: MonitorValidationResult): Promise<void>;
  getValidationResult(validationId: string): Promise<MonitorValidationResult | null>;
  getValidationResultsByRequest(requestId: string): Promise<MonitorValidationResult[]>;

  // Decisions
  saveAutoDecisionLog(log: AutoDecisionLog): Promise<void>;
  getAutoDecisionLog(decisionId: string): Promise<AutoDecisionLog | null>;
  getAutoDecisionLogsByValidation(validationId: string): Promise<AutoDecisionLog[]>;
}

export class InMemoryValidationStore implements ValidationStore {
  private requests: MonitorValidationRequest[] = [];
  private results: MonitorValidationResult[] = [];
  private decisions: AutoDecisionLog[] = [];

  // Requests
  async saveValidationRequest(request: MonitorValidationRequest): Promise<void> {
    const index = this.requests.findIndex((r) => r.id === request.id);
    if (index >= 0) {
      this.requests[index] = request;
    } else {
      this.requests.push(request);
    }
  }

  async getValidationRequest(requestId: string): Promise<MonitorValidationRequest | null> {
    return this.requests.find((r) => r.id === requestId) || null;
  }

  async getAllValidationRequests(): Promise<MonitorValidationRequest[]> {
    return [...this.requests];
  }

  // Results
  async saveValidationResult(result: MonitorValidationResult): Promise<void> {
    const index = this.results.findIndex((r) => r.validationId === result.validationId);
    if (index >= 0) {
      this.results[index] = result;
    } else {
      this.results.push(result);
    }
  }

  async getValidationResult(validationId: string): Promise<MonitorValidationResult | null> {
    return this.results.find((r) => r.validationId === validationId) || null;
  }

  async getValidationResultsByRequest(requestId: string): Promise<MonitorValidationResult[]> {
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
