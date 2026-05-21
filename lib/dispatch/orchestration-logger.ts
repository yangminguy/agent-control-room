import fs from "fs";
import path from "path";
import type { OrchestrationLogEvent } from "../types";

export type { OrchestrationLogEvent };

function logFilePath(): string {
  return process.env.ORCHESTRATION_LOG_PATH
    ? path.resolve(process.cwd(), process.env.ORCHESTRATION_LOG_PATH)
    : path.resolve(process.cwd(), "data/orchestration-logs.ndjson");
}

export function logOrchestrationEvent(event: OrchestrationLogEvent): void {
  try {
    const LOG_FILE = logFilePath();
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
