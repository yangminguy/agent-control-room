// Warm-session store — one claude session id per FeaturePlan, shared across its
// phases so consecutive claude phases resume instead of cold-starting (re-reading
// CLAUDE.md + re-exploring the repo every phase). Only claude is warmed: its
// caller-assigned `--session-id` + `--resume` is clean and parallel-safe (no id
// capture hack), unlike codex (`--last` cross-contaminates) or agy (no headless
// id emission). Opt-in via ACR_WARM_SESSIONS=1.
//
// Tiny JSON side-store (not the FeaturePlan schema) so this stays isolated and
// removable. Keyed by planId → claude session uuid.

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DATA_DIR = process.env.FEATURE_PLANS_DATA_DIR || path.join(process.cwd(), "data");
const STORE = path.join(DATA_DIR, "warm-sessions.json");

export const WARM_SESSIONS_ENABLED = process.env.ACR_WARM_SESSIONS === "1";

async function readStore(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(STORE, "utf8"));
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, string>): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // best-effort; warm sessions are an optimization, never a correctness gate.
  }
}

/** The claude session id already started for this plan, or undefined (first claude phase). */
export async function getWarmSession(planId: string): Promise<string | undefined> {
  if (!WARM_SESSIONS_ENABLED || !planId) return undefined;
  return (await readStore())[planId];
}

/** Record the claude session id started for this plan so later phases resume it. */
export async function setWarmSession(planId: string, sessionId: string): Promise<void> {
  if (!WARM_SESSIONS_ENABLED || !planId) return;
  const data = await readStore();
  data[planId] = sessionId;
  await writeStore(data);
}

/** Drop a plan's warm session (on plan completion) to keep the store small. */
export async function clearWarmSession(planId: string): Promise<void> {
  if (!planId) return;
  const data = await readStore();
  if (data[planId]) {
    delete data[planId];
    await writeStore(data);
  }
}

/** A fresh lowercase uuid suitable for `claude --session-id`. */
export function newSessionId(): string {
  return randomUUID();
}
