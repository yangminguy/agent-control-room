import { promises as fs } from "fs";
import path from "path";
import type { Roadmap, FeaturePlan, RoadmapStatus } from "@/lib/types";
import { getSupabaseClient } from "./supabase-client";
import { convertFeaturePlansToRoadmap } from "@/lib/roadmap";

const DATA_DIR = path.join(process.cwd(), "data");
const ROADMAP_FILE = "roadmap.json";

type DbRow = Record<string, string | number | boolean | null | unknown[] | object>;

// ─── JSON helpers (fallback) ────────────────────────────────────────────────

async function readJson<T>(fileName: string): Promise<T> {
  const file = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
  return JSON.parse(file) as T;
}

async function writeJson<T>(fileName: string, value: T): Promise<void> {
  await fs.writeFile(
    path.join(DATA_DIR, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

// ─── JSON-only helpers for local mutation ───────────────────────────────────

async function readRoadmapJson(): Promise<Roadmap> {
  return readJson<Roadmap>(ROADMAP_FILE);
}

async function writeRoadmapJson(roadmap: Roadmap): Promise<void> {
  await writeJson(ROADMAP_FILE, roadmap);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * 프로젝트의 로드맵 데이터 읽기
 */
export async function getRoadmap(projectId: string): Promise<Roadmap | null> {
  try {
    const roadmap = await readRoadmapJson();
    if (roadmap && roadmap.projectId === projectId) {
      return roadmap;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 모든 로드맵 데이터 읽기
 */
export async function getAllRoadmaps(): Promise<Roadmap[]> {
  try {
    const roadmap = await readRoadmapJson();
    return roadmap ? [roadmap] : [];
  } catch {
    return [];
  }
}

/**
 * 로드맵 데이터 저장
 */
export async function saveRoadmap(roadmap: Roadmap): Promise<void> {
  await writeRoadmapJson(roadmap);
}

/**
 * FeaturePlan 목록으로부터 로드맵 생성 및 저장
 * (기존 feature-plans.json과의 동기)
 */
export async function generateRoadmapFromFeaturePlans(
  projectId: string,
  plans: FeaturePlan[],
  productVision?: string,
): Promise<Roadmap> {
  const roadmap = convertFeaturePlansToRoadmap(projectId, plans, productVision);
  await saveRoadmap(roadmap);
  return roadmap;
}

/**
 * 로드맵 단계 상태 업데이트
 */
export async function updateRoadmapStageStatus(
  projectId: string,
  stageId: string,
  updates: {
    status?: RoadmapStatus;
    completionPercentage?: number;
    nextAction?: string;
    responsibleAgent?: import("@/lib/types").AgentType;
  },
): Promise<Roadmap | null> {
  const roadmap = await getRoadmap(projectId);
  if (!roadmap) return null;

  const now = new Date().toISOString();
  roadmap.stages = roadmap.stages.map((stage) => {
    if (stage.id === stageId) {
      return {
        ...stage,
        status: updates.status ?? stage.status,
        completionPercentage: updates.completionPercentage ?? stage.completionPercentage,
        nextAction: updates.nextAction ?? stage.nextAction,
        responsibleAgent: updates.responsibleAgent ?? stage.responsibleAgent,
        updatedAt: now,
      };
    }
    return stage;
  });

  // 전체 로드맵 메트릭 재계산
  roadmap.overallProgress = Math.round(
    roadmap.stages.reduce((sum, s) => sum + (s.completionPercentage || 0), 0) /
      (roadmap.stages.length || 1)
  );
  roadmap.completedStageCount = roadmap.stages.filter(
    (s) => s.status === "completed"
  ).length;
  roadmap.activeStageCount = roadmap.stages.filter(
    (s) => s.status === "active"
  ).length;
  roadmap.blockedStageCount = roadmap.stages.filter(
    (s) => s.status === "blocked"
  ).length;

  roadmap.updatedAt = new Date().toISOString();

  await saveRoadmap(roadmap);
  return roadmap;
}
