/**
 * POST /api/projects
 *
 * Phase 15 (L5 Business OS): idempotent project registration.
 *
 * Called by:
 *   - L5 CTO Agent (services/agent-runtime/src/agents/cto.ts) on dispatch
 *   - L5 NocoBase plugin-business-portfolio on business creation
 *
 * Request body:
 * {
 *   project_id:    string          — stable id (e.g. L5 business id or task id)
 *   title:         string
 *   one_liner?:    string
 *   l5_business_id?: string
 *   project_path?: string          — absolute path on host. If present, triggers docs ingestion.
 * }
 *
 * Response:
 * {
 *   id: string                     — ACR project id (== project_id)
 *   created: boolean               — true if newly inserted, false if upserted
 * }
 *
 * Ingestion (AGENTS.md / CLAUDE.md / docs/*.md) is fire-and-forget so the
 * caller does not block on filesystem reads.
 */

import { NextResponse } from "next/server";
import { upsertProjectById, getProjects, saveProject } from "@/lib/storage/json-store";
import { ingestProjectDocs } from "@/lib/ingestion/project-docs-ingestor";

export const runtime = "nodejs";

const DANGEROUS_PATHS = new Set([
  "/", "/etc", "/usr", "/var", "/sys", "/proc",
  "C:\\", "C:\\Program Files", "C:\\Windows",
]);

// Phase 3c: live repos that must never be registered as an agent workspace.
// Defaults to the L5 monorepo; override/extend via L5_PROTECTED_PATHS (comma-sep).
const PROTECTED_PATHS: string[] = (
  process.env.L5_PROTECTED_PATHS ?? "/Users/wonminyang/Desktop/pulk"
)
  .split(",")
  .map((s) => s.trim().replace(/\\/g, "/").replace(/\/+$/, ""))
  .filter(Boolean);

function isDangerousPath(p: string): boolean {
  const norm = p.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (!norm) return true;
  if (DANGEROUS_PATHS.has(norm)) return true;
  if (norm === "/Users" || norm === "/Volumes") return true;
  // Block any protected live repo or a path inside it.
  if (PROTECTED_PATHS.some((pp) => norm === pp || norm.startsWith(pp + "/"))) return true;
  return false;
}

interface RegisterBody {
  project_id?: string;
  title?: string;
  one_liner?: string;
  l5_business_id?: string;
  project_path?: string;
}

export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const projectId = (body.project_id ?? "").trim();
  const title = (body.title ?? "").trim();
  const projectPath = (body.project_path ?? "").trim();

  if (!projectId) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (projectPath && isDangerousPath(projectPath)) {
    return NextResponse.json(
      { error: "project_path points to a forbidden system directory" },
      { status: 400 },
    );
  }

  try {
    const existingBefore = (await getProjects()).find((p) => p.id === projectId);
    const project = await upsertProjectById({
      id: projectId,
      name: title,
      path: projectPath || existingBefore?.path || "",
      description: body.one_liner,
    });

    // Fire-and-forget docs ingestion. Don't block the response.
    if (projectPath) {
      setImmediate(() => {
        ingestProjectDocs(projectId, projectPath)
          .then(async (docs) => {
            if (docs.length === 0) return;
            await saveProject({ ...project, docs, updatedAt: new Date().toISOString() });
          })
          .catch((err) => {
            console.warn(`[projects:register] ingestion failed for ${projectId}:`, err?.message ?? err);
          });
      });
    }

    return NextResponse.json({
      id: project.id,
      created: !existingBefore,
      project_path: project.path || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[projects:register] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
