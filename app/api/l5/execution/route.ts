/**
 * GET /api/l5/execution
 *
 * L5 Business OS 컨트롤룸이 ACR 실행 진행상황을 폴링하는 엔드포인트 (M9.1).
 * L5의 `acr-execution-transport.ts`가 `?projectId=l5-<businessId>`로 호출하고
 * `{ tasks: AcrExecTask[] }`를 기대한다. L5는 각 레코드를 **L5 task id**(== acr_task_id)로
 * 키잉하므로(`acrByTaskId[t.id]`), 한 L5 CTO task(= 한 FeaturePlan, 여러 PlanTask phase)를
 * **l5_task_id당 AcrExecTask 1개로 집계**해서 "phase x / N"로 보여준다.
 *
 * projectId 스코핑 주의: ACR은 business_id를 저장하지 않아 business로 필터할 수 없다.
 * projectId가 구체 task project(`l5-<l5_task_id>`)와 일치하면 그것만, 아니면(business id 등)
 * 알려진 모든 L5 실행 레코드를 반환한다. L5가 task id로 골라내므로 결과는 정확하다.
 * (TODO: ACRIntent에 business_id 추가 시 진짜 business 스코핑 가능 — M9.3.)
 *
 * 인증: `x-l5-shared-secret` 헤더 == process.env.L5_SHARED_SECRET (auto-dispatch 패턴).
 *
 * Phase 6: total_tokens + estimated_cost_usd를 plan의 phase별 ExecutionLog에서
 * 합산해 반환한다. claude 캡처(ACR_CAPTURE_TOKENS=1, --output-format stream-json)
 * 시에만 채워지며, 미캡처/타 CLI는 null.
 */

import { NextRequest, NextResponse } from "next/server";
import { getFeaturePlanById } from "@/lib/storage/feature-plan-store";
import { getExecutionLogByTaskId } from "@/lib/storage/execution-log-store";
import { getLogTail } from "@/lib/runner/git-utils";
import { promises as fs } from "fs";
import path from "path";
import type { FeaturePlan, PlanTask } from "@/lib/types";

export const runtime = "nodejs";

/** L5 `AcrExecTask` 계약(plugin-executive-monitor/acr-execution-transport.ts)과 일치. */
interface AcrExecTask {
  acr_task_id: string; // == L5 task id
  assigned_agent: string | null;
  plan_status: string | null;
  phase_index: number | null;
  phase_total: number | null;
  branch: string | null;
  workspace_status: string | null;
  changed_files: number | null; // 개수 (목록 아님)
  log_tail: string | null;
  updated_at: string | null;
  // Phase 6 — measured token usage + cost, summed across the plan's phases
  // (null when no phase captured tokens; capture is opt-in via ACR_CAPTURE_TOKENS).
  total_tokens: number | null;
  estimated_cost_usd: number | null;
}

const DATA_DIR = process.env.FEATURE_PLANS_DATA_DIR || path.join(process.cwd(), "data");

/** cto-task-metadata.json을 직접 읽어 l5_task_id → planId 매핑을 모은다(전용 lister 부재). */
async function readAllMetadata(): Promise<
  Array<{ planId: string; l5_task_id: string; createdAt: string }>
> {
  try {
    const text = await fs.readFile(path.join(DATA_DIR, "cto-task-metadata.json"), "utf8");
    const store = JSON.parse(text) as Record<
      string,
      { planId: string; l5_task_id: string; createdAt: string }
    >;
    return Object.values(store);
  } catch {
    return [];
  }
}

/** 한 FeaturePlan(여러 phase)을 l5_task_id당 AcrExecTask 1개로 집계한다. */
async function aggregatePlan(
  plan: FeaturePlan,
  l5TaskId: string,
): Promise<AcrExecTask> {
  const tasks = plan.tasks ?? [];
  const total = tasks.length;

  const runningIdx = tasks.findIndex((t) => t.status === "running");
  const doneCount = tasks.filter(
    (t) => t.status === "done" || t.status === "partial",
  ).length;
  // 진행 위치: running phase가 있으면 그 1-based 위치, 없으면 완료 수.
  const phaseIndex = runningIdx >= 0 ? runningIdx + 1 : Math.min(doneCount, total);

  // 현재 활성(또는 가장 멀리 진행된) phase — branch/agent/log의 출처.
  const activeTask: PlanTask | undefined =
    runningIdx >= 0
      ? tasks[runningIdx]
      : [...tasks].reverse().find((t) => t.status !== "planned") ?? tasks[total - 1];

  const changedFiles = tasks.reduce(
    (sum, t) => sum + (Array.isArray(t.changedFiles) ? t.changedFiles.length : 0),
    0,
  );

  let logTail: string | null = null;
  let branch: string | null = activeTask?.branchName ?? null;
  // Sum measured tokens + cost across every phase (each phase = one CLI run).
  let totalTokens = 0;
  let costUsd = 0;
  let anyTokens = false;
  for (const t of tasks) {
    const log = await getExecutionLogByTaskId(t.id);
    if (!log) continue;
    if (activeTask && t.id === activeTask.id) {
      logTail = getLogTail(log.logLines ?? []);
      branch = branch ?? log.branchName ?? null;
    }
    if (typeof log.total_tokens === "number") {
      totalTokens += log.total_tokens;
      anyTokens = true;
    }
    if (typeof log.estimated_cost_usd === "number") {
      costUsd += log.estimated_cost_usd;
      anyTokens = true;
    }
  }

  return {
    acr_task_id: l5TaskId,
    assigned_agent: activeTask?.assignedAgent ?? null,
    plan_status: plan.status ?? null,
    phase_index: total > 0 ? phaseIndex : null,
    phase_total: total > 0 ? total : null,
    branch,
    workspace_status: activeTask?.status ?? null,
    changed_files: changedFiles,
    log_tail: logTail,
    updated_at: plan.updatedAt ?? null,
    total_tokens: anyTokens ? totalTokens : null,
    estimated_cost_usd: anyTokens ? Number(costUsd.toFixed(4)) : null,
  };
}

export async function GET(req: NextRequest) {
  // ── 인증 (auto-dispatch/route.ts 패턴) ──
  const secret = process.env.L5_SHARED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "L5_SHARED_SECRET not configured on ACR" },
      { status: 503 },
    );
  }
  if (req.headers.get("x-l5-shared-secret") !== secret) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const projectId = new URL(req.url).searchParams.get("projectId") ?? "";

    // l5_task_id별 최신 plan만 남긴다(재dispatch 시 planId에 timestamp가 붙어 중복 가능).
    const meta = await readAllMetadata();
    const latestPlanByTask = new Map<string, { planId: string; createdAt: string }>();
    for (const m of meta) {
      const prev = latestPlanByTask.get(m.l5_task_id);
      if (!prev || m.createdAt > prev.createdAt) {
        latestPlanByTask.set(m.l5_task_id, { planId: m.planId, createdAt: m.createdAt });
      }
    }

    // projectId가 구체 task project(`l5-<l5_task_id>`)와 일치하면 그것만 스코핑.
    // 그 외(business id 등)는 알려진 모든 L5 실행을 반환 — L5가 task id로 골라낸다.
    let entries = [...latestPlanByTask.entries()]; // [l5_task_id, {planId}]
    if (projectId.startsWith("l5-") && latestPlanByTask.has(projectId.slice(3))) {
      const tid = projectId.slice(3);
      entries = [[tid, latestPlanByTask.get(tid)!]];
    }

    const tasks: AcrExecTask[] = [];
    for (const [l5TaskId, { planId }] of entries) {
      const plan = await getFeaturePlanById(planId);
      if (!plan) continue;
      tasks.push(await aggregatePlan(plan, l5TaskId));
    }

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    console.error("[l5/execution] GET error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
