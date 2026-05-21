import fs from "fs";
import path from "path";
import type { OrchestrationLogEvent } from "../types";

export type { OrchestrationLogEvent };

const LOG_FILE = process.env.ORCHESTRATION_LOG_PATH
  ? path.resolve(process.cwd(), process.env.ORCHESTRATION_LOG_PATH)
  : path.resolve(process.cwd(), "data/orchestration-logs.ndjson");

export function logOrchestrationEvent(event: OrchestrationLogEvent): void {
  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const line = JSON.stringify(event) + "\n";
    fs.appendFileSync(LOG_FILE, line, "utf8");
  } catch {
    // Logging must never throw — swallow silently
  }
}
