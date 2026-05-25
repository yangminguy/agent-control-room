import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

// GET /api/ops/workspaces — returns all non-archived workspaces
export async function GET() {
  try {
    const storeFile = path.join(process.cwd(), "data", "workspaces.json");
    let all: Array<{ status: string }> = [];

    try {
      const content = await fs.readFile(storeFile, "utf8");
      all = JSON.parse(content);
    } catch {
      // file may not exist yet
    }

    const active = all.filter((ws) => ws.status !== "archived");
    return Response.json({ workspaces: active, total: all.length, active: active.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
