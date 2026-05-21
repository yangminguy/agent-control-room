import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { OrchestrationLogEvent } from "@/lib/types";

const LOG_FILE = path.resolve(process.cwd(), "data/orchestration-logs.ndjson");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const eventFilter = searchParams.get("event");

  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 1000) : 100;

  let events: OrchestrationLogEvent[] = [];

  if (fs.existsSync(LOG_FILE)) {
    const raw = fs.readFileSync(LOG_FILE, "utf8");
    events = raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line) as OrchestrationLogEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is OrchestrationLogEvent => e !== null);
  }

  // Filter by event type if specified
  if (eventFilter) {
    events = events.filter((e) => e.event === eventFilter);
  }

  // Sort reverse chronological (newest first)
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const total = events.length;

  // Paginate: take first `limit` after sorting
  const paginated = events.slice(0, limit);

  return NextResponse.json({ events: paginated, total });
}
