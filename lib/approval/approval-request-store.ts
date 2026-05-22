import { promises as fs } from "fs";
import path from "path";
import type { ApprovalRequest, ApprovalRequestStatus } from "@/lib/types";

type TelegramApprovalResponse = "approve" | "reject" | "preview_first" | "control_room";

// ─── Storage helpers ──────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const APPROVAL_FILE = "approval-requests.json";

function approvalFilePath(): string {
  return process.env.APPROVAL_REQUESTS_PATH
    ? path.resolve(process.cwd(), process.env.APPROVAL_REQUESTS_PATH)
    : path.join(DATA_DIR, APPROVAL_FILE);
}

function generateId(): string {
  return `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<ApprovalRequest[]> {
  try {
    const raw = await fs.readFile(approvalFilePath(), "utf8");
    return JSON.parse(raw) as ApprovalRequest[];
  } catch {
    return [];
  }
}

async function writeAll(records: ApprovalRequest[]): Promise<void> {
  const filePath = approvalFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

// ─── ApprovalRequestStore ─────────────────────────────────────────────────────

export class ApprovalRequestStore {
  /**
   * Create and persist a new ApprovalRequest linked to a DispatchJob.
   */
  async createApprovalRequest(
    dispatchJobId: string,
    options?: {
      discordMessageId?: string;
      discordMessagePreview?: string;
      destructivePatterns?: string[];
    },
  ): Promise<ApprovalRequest> {
    const now = new Date().toISOString();
    const record: ApprovalRequest = {
      id: generateId(),
      dispatchJobId,
      status: "pending",
      createdAt: now,
      discordMessageId: options?.discordMessageId,
      discordMessagePreview: options?.discordMessagePreview,
      destructivePatterns: options?.destructivePatterns,
    };

    const existing = await readAll();
    existing.unshift(record);
    await writeAll(existing);
    return record;
  }

  /**
   * Retrieve a single ApprovalRequest by its ID.
   * Returns undefined if not found.
   */
  async getApprovalRequest(id: string): Promise<ApprovalRequest | undefined> {
    const all = await readAll();
    return all.find((r) => r.id === id);
  }

  /**
   * Update the status of an ApprovalRequest and set resolvedAt timestamp.
   * Returns the updated record, or undefined if the ID was not found.
   */
  async updateApprovalStatus(
    id: string,
    status: ApprovalRequestStatus,
    options?: {
      approverNote?: string;
    },
  ): Promise<ApprovalRequest | undefined> {
    const all = await readAll();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;

    const updated: ApprovalRequest = {
      ...all[idx],
      status,
      resolvedAt: new Date().toISOString(),
      approverNote: options?.approverNote,
    };
    all[idx] = updated;
    await writeAll(all);
    return updated;
  }

  /**
   * Record a Telegram approval response for a dispatch job.
   *
   * approve/reject resolve the approval. preview_first/control_room keep the
   * approval pending because they are user routing choices, not execution
   * authorization.
   */
  async recordTelegramResponse(
    dispatchJobId: string,
    response: TelegramApprovalResponse,
    options?: {
      approverNote?: string;
    },
  ): Promise<ApprovalRequest> {
    const all = await readAll();
    const idx = all.findIndex((r) => r.dispatchJobId === dispatchJobId);
    const now = new Date().toISOString();
    const resolvedStatus: ApprovalRequestStatus | null =
      response === "approve" ? "approved" : response === "reject" ? "rejected" : null;

    if (idx === -1) {
      const record: ApprovalRequest = {
        id: generateId(),
        dispatchJobId,
        status: resolvedStatus ?? "pending",
        createdAt: now,
        resolvedAt: resolvedStatus ? now : undefined,
        approverNote: options?.approverNote,
        approvalSource: "telegram",
        telegramResponse: response,
        telegramResponseAt: now,
      };
      all.unshift(record);
      await writeAll(all);
      return record;
    }

    const updated: ApprovalRequest = {
      ...all[idx],
      status: resolvedStatus ?? all[idx].status,
      resolvedAt: resolvedStatus ? now : all[idx].resolvedAt,
      approverNote: options?.approverNote,
      approvalSource: "telegram",
      telegramResponse: response,
      telegramResponseAt: now,
    };
    all[idx] = updated;
    await writeAll(all);
    return updated;
  }

  /**
   * Get all ApprovalRequests linked to a specific DispatchJob.
   */
  async getByDispatchJobId(dispatchJobId: string): Promise<ApprovalRequest[]> {
    const all = await readAll();
    return all.filter((r) => r.dispatchJobId === dispatchJobId);
  }

  /**
   * Get all ApprovalRequests with status "pending".
   */
  async getPendingApprovals(): Promise<ApprovalRequest[]> {
    const all = await readAll();
    return all.filter((r) => r.status === "pending");
  }
}
