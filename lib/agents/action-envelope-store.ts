// Release Gate Action Envelope Store
// Persists approved action envelopes and execution records

import { promises as fs } from "fs";
import path from "path";
import { ActionEnvelope } from "./action-envelope";

export type ActionEnvelopeStoreResult = {
  success: boolean;
  data?: any;
  error?: string;
};

const ENVELOPES: Map<string, ActionEnvelope> = new Map();
const STORE_FILE = path.join(process.cwd(), ".claude", "action-envelopes.json");

/**
 * Save action envelope to store
 */
export async function saveActionEnvelope(envelope: ActionEnvelope): Promise<ActionEnvelopeStoreResult> {
  try {
    ENVELOPES.set(envelope.id, envelope);
    await persistEnvelopes();
    return { success: true, data: { id: envelope.id } };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save action envelope: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Retrieve action envelope by ID
 */
export async function getActionEnvelope(id: string): Promise<ActionEnvelopeStoreResult> {
  try {
    await hydrateFromDisk();

    const envelope = ENVELOPES.get(id);
    if (!envelope) {
      return { success: false, error: `Action envelope not found: ${id}` };
    }

    return { success: true, data: envelope };
  } catch (error) {
    return {
      success: false,
      error: `Failed to retrieve action envelope: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * List all pending action envelopes
 */
export async function listPendingEnvelopes(): Promise<ActionEnvelopeStoreResult> {
  try {
    await hydrateFromDisk();

    const now = new Date();
    const pending = Array.from(ENVELOPES.values()).filter((e) => {
      return !e.approvedAt && new Date(e.expiresAt) > now;
    });

    return { success: true, data: { envelopes: pending, count: pending.length } };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list pending envelopes: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Approve an action envelope
 */
export async function approveActionEnvelope(id: string, approver: string): Promise<ActionEnvelopeStoreResult> {
  try {
    await hydrateFromDisk();

    const envelope = ENVELOPES.get(id);
    if (!envelope) {
      return { success: false, error: `Action envelope not found: ${id}` };
    }

    if (envelope.approvedAt) {
      return { success: false, error: `Action envelope already approved: ${id}` };
    }

    envelope.approver = approver;
    envelope.approvedAt = new Date().toISOString();

    await persistEnvelopes();

    return { success: true, data: envelope };
  } catch (error) {
    return {
      success: false,
      error: `Failed to approve action envelope: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Reject an action envelope
 */
export async function rejectActionEnvelope(id: string): Promise<ActionEnvelopeStoreResult> {
  try {
    await hydrateFromDisk();

    const envelope = ENVELOPES.get(id);
    if (!envelope) {
      return { success: false, error: `Action envelope not found: ${id}` };
    }

    ENVELOPES.delete(id);
    await persistEnvelopes();

    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: `Failed to reject action envelope: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Record action execution result
 */
export async function recordActionExecution(id: string, result: string): Promise<ActionEnvelopeStoreResult> {
  try {
    await hydrateFromDisk();

    const envelope = ENVELOPES.get(id);
    if (!envelope) {
      return { success: false, error: `Action envelope not found: ${id}` };
    }

    envelope.executionResult = result;
    await persistEnvelopes();

    return { success: true, data: envelope };
  } catch (error) {
    return {
      success: false,
      error: `Failed to record action execution: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Hydrate store from disk (lazy)
 */
async function hydrateFromDisk(): Promise<void> {
  if (ENVELOPES.size > 0) return;

  try {
    const content = await fs.readFile(STORE_FILE, "utf-8");
    const data = JSON.parse(content);

    for (const envelope of data) {
      ENVELOPES.set(envelope.id, envelope);
    }
  } catch (error) {
    // File may not exist yet; that's OK
    if (error instanceof Error && "code" in error && error.code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Persist store to disk
 */
async function persistEnvelopes(): Promise<void> {
  try {
    const dir = path.dirname(STORE_FILE);
    await fs.mkdir(dir, { recursive: true });

    const data = Array.from(ENVELOPES.values());
    const tmpPath = `${STORE_FILE}.tmp`;

    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(tmpPath, STORE_FILE);
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EROFS" || code === "EACCES") {
        // Read-only filesystem; silent fallback to memory-only
        return;
      }
    }
    throw error;
  }
}
