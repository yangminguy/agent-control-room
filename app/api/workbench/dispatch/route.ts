/**
 * POST /api/workbench/dispatch
 *
 * L5 CTO Agent가 개발 단계 패킷을 ACR로 전달하는 엔드포인트.
 * ACRIntent(CTOPhase[])를 받아 FeaturePlan + PlanTask[]로 변환 후 저장.
 *
 * Request body: ACRIntent
 * {
 *   l5_task_id: string          — L5 agent_tasks PK (callback 시 사용)
 *   task_title: string          — 원본 CTO 태스크 제목
 *   phases: CTOPhase[]          — 각 개발 단계
 *   created_at: string
 * }
 *
 * Response:
 * {
 *   success: true
 *   plan_id: string
 *   task_ids: string[]
 * }
 */

import { addFeaturePlan } from "@/lib/storage/feature-plan-store";
import { saveCTOTaskMetadataBatch, type CTOTaskMetadata } from "@/lib/storage/cto-task-metadata-store";
import { scheduleAutoDispatch } from "@/lib/orchestration/auto-dispatcher";
import { upsertProjectById, getProjects, saveProject } from "@/lib/storage/json-store";
import { ingestProjectDocs } from "@/lib/ingestion/project-docs-ingestor";
import type { PlanTask, AgentType } from "@/lib/types";

export const runtime = "nodejs";

type CTOPhaseRuntime = "claude" | "codex" | "antigravity" | "omc";
type ReleaseGateType = "none" | "auto_24h" | "manual_founder";

interface CTOPhase {
  name: string;
  runtime: CTOPhaseRuntime;
  prompt_packet: string;
  expected_output: string;
  risk_level: "D1" | "D2" | "D3" | "D4" | "D5";
  release_gate_type: ReleaseGateType;
  l5_approval_required: boolean;
  auto_execute: boolean;
  /** Phase 18.1: pre-dispatch headless clarification questions to L5 CTO */
  clarifying_questions?: string[];
}

interface ACRIntent {
  l5_task_id: string;
  task_title: string;
  phases: CTOPhase[];
  created_at: string;
  /** Optional absolute project path resolved by L5 CTO. Falls back to project lookup. */
  project_path?: string;
}

function mapRuntime(runtime: CTOPhaseRuntime): AgentType {
  switch (runtime) {
    case "claude": return "claude-code";
    case "codex": return "codex";
    case "antigravity": return "antigravity";
    case "omc": return "claude-code"; // OMC 미설치 시 claude-code fallback
    default: return "claude-code";
  }
}

// L5 D-level → ACR 우선순위 매핑
function mapPriority(riskLevel: string): "P0" | "P1" | "P2" | "P3" {
  switch (riskLevel) {
    case "D5": return "P0";
    case "D4": return "P0";
    case "D3": return "P1";
    case "D2": return "P2";
    default:   return "P3";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ACRIntent;

    if (!body.l5_task_id || !body.task_title || !Array.isArray(body.phases)) {
      return Response.json(
        { success: false, error: "l5_task_id, task_title, phases are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const planId = `l5-${body.l5_task_id}-${Date.now()}`;
    const projectId = `l5-${body.l5_task_id}`;

    // Phase 15: if a project_path is provided and no matching ACR project exists,
    // auto-create one so the runner has a valid cwd + persisted docs.
    if (body.project_path) {
      const existing = (await getProjects()).find((p) => p.id === projectId);
      if (!existing) {
        const project = await upsertProjectById({
          id: projectId,
          name: body.task_title,
          path: body.project_path,
        });
        setImmediate(() => {
          ingestProjectDocs(projectId, body.project_path!)
            .then(async (docs) => {
              if (docs.length === 0) return;
              await saveProject({ ...project, docs, updatedAt: new Date().toISOString() });
            })
            .catch((err) => {
              console.warn(`[workbench/dispatch] ingestion failed for ${projectId}:`, err?.message ?? err);
            });
        });
      }
    }

    // CTOPhase[] → PlanTask[]
    const tasks: PlanTask[] = body.phases.map((phase, index) => ({
      id: `${planId}-task-${index + 1}`,
      planId,
      title: phase.name,
      description: phase.prompt_packet,
      status: "planned" as const,
      assignedAgent: mapRuntime(phase.runtime),
      priority: mapPriority(phase.risk_level),
      acceptanceCriteria: [phase.expected_output],
      subAgentTracks: [],
      generatedPrompt: phase.prompt_packet,
      clarifyingQuestions: phase.clarifying_questions,
      createdAt: now,
      updatedAt: now,
    }));

    // FeaturePlan으로 저장
    const plan = await addFeaturePlan({
      projectId,
      title: `[L5] ${body.task_title}`,
      userGoal: `L5 CTO 태스크: ${body.task_title} (l5_task_id: ${body.l5_task_id})`,
      status: "planned",
      tasks,
    });

    // Sidecar metadata for auto-dispatcher (Phase 14)
    const metadataEntries: CTOTaskMetadata[] = plan.tasks.map((task, idx) => {
      const phase = body.phases[idx];
      return {
        planId: plan.id,
        taskId: task.id,
        l5_task_id: body.l5_task_id,
        auto_execute: phase?.auto_execute ?? false,
        release_gate_type: phase?.release_gate_type ?? "manual_founder",
        risk_level: phase?.risk_level ?? "D3",
        runtime: phase?.runtime ?? "claude",
        cwd: body.project_path,
        createdAt: now,
      };
    });
    await saveCTOTaskMetadataBatch(metadataEntries);

    // Fire-and-forget: trigger auto-dispatch for D1-D2 phases
    const hasAutoExec = metadataEntries.some((m) => m.auto_execute);
    if (hasAutoExec) {
      scheduleAutoDispatch(plan.id).catch((err) => {
        console.warn(`[workbench/dispatch] auto-dispatch schedule failed for ${plan.id}:`, err?.message ?? err);
      });
    }

    return Response.json({
      success: true,
      plan_id: plan.id,
      task_ids: plan.tasks.map((t) => t.id),
      l5_task_id: body.l5_task_id,
      phase_count: body.phases.length,
      auto_dispatch_scheduled: hasAutoExec,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[workbench/dispatch] error:", message);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
