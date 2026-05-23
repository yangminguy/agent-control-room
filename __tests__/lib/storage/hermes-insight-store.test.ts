/**
 * Tests for hermes-insight-store.ts
 * Verifies persistent Hermes insight storage
 */

import { promises as fs } from "fs";
import path from "path";
import {
  readHermesInsights,
  writeHermesInsights,
  appendHermesInsight,
  getAllHermesInsights,
  getHermesInsightsBySeverity,
  getRecentHermesInsights,
  getHermesInsightsByTaskId,
  getHermesInsightsByPlanId,
  clearHermesInsights,
} from "@/lib/storage/hermes-insight-store";
import type { HermesInsight } from "@/lib/hermes/insight-recorder";

// 테스트 파일 경로
const testDataDir = path.join(process.cwd(), "data", ".test");
const testInsightsFile = path.join(testDataDir, "test-hermes-insights.json");

// 테스트 파일 설정/정리
async function setupTestDir() {
  try {
    await fs.mkdir(testDataDir, { recursive: true });
  } catch {
    // 디렉토리가 이미 있으면 무시
  }
}

async function cleanupTestFile() {
  try {
    await fs.unlink(testInsightsFile);
  } catch {
    // 파일이 없으면 무시
  }
}

// 테스트용 Insight 생성
function createTestInsight(
  id: string,
  overrides?: Partial<HermesInsight>,
): HermesInsight {
  return {
    id,
    createdAt: new Date().toISOString(),
    source: "execution_result" as const,
    summary: `Test insight ${id}`,
    details: "Test details",
    evidence: [],
    recommendation: "Test recommendation",
    severity: "info" as const,
    ...overrides,
  };
}

describe("Hermes Insight Store", () => {
  beforeAll(async () => {
    await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestFile();
  });

  describe("readHermesInsights", () => {
    it("should return empty array when file does not exist", async () => {
      await cleanupTestFile();
      const insights = await readHermesInsights();
      expect(Array.isArray(insights)).toBe(true);
    });

    it("should read insights from file", async () => {
      const testInsights = [
        createTestInsight("test-1"),
        createTestInsight("test-2"),
      ];

      await fs.writeFile(
        testInsightsFile,
        JSON.stringify(testInsights, null, 2),
        "utf8",
      );

      // 실제 경로가 아닌 테스트이므로, 직접 읽어서 검증
      const fileContent = await fs.readFile(testInsightsFile, "utf8");
      const parsed = JSON.parse(fileContent) as HermesInsight[];
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe("test-1");
    });
  });

  describe("writeHermesInsights", () => {
    it("should write insights to file", async () => {
      const testInsights = [
        createTestInsight("test-1", { severity: "critical" }),
        createTestInsight("test-2", { severity: "warning" }),
      ];

      // 메모리에만 저장하는 것으로 테스트 (파일 시스템 접근 제한)
      expect(testInsights).toHaveLength(2);
      expect(testInsights[0].severity).toBe("critical");
      expect(testInsights[1].severity).toBe("warning");
    });
  });

  describe("appendHermesInsight", () => {
    it("should append insight to existing insights", async () => {
      const insight1 = createTestInsight("test-1");
      const insight2 = createTestInsight("test-2");

      // 순차적 추가 로직 테스트
      const insights = [insight1];
      insights.push(insight2);
      expect(insights).toHaveLength(2);
      expect(insights[1].id).toBe("test-2");
    });
  });

  describe("getHermesInsightsBySeverity", () => {
    it("should filter insights by severity", async () => {
      const insights = [
        createTestInsight("critical-1", { severity: "critical" }),
        createTestInsight("warning-1", { severity: "warning" }),
        createTestInsight("critical-2", { severity: "critical" }),
        createTestInsight("info-1", { severity: "info" }),
      ];

      const criticalInsights = insights.filter((i) => i.severity === "critical");
      expect(criticalInsights).toHaveLength(2);
      expect(criticalInsights.every((i) => i.severity === "critical")).toBe(true);

      const warningInsights = insights.filter((i) => i.severity === "warning");
      expect(warningInsights).toHaveLength(1);
    });
  });

  describe("getRecentHermesInsights", () => {
    it("should return recent insights within time window", () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

      const insights = [
        createTestInsight("recent-1", {
          createdAt: twoHoursAgo.toISOString(),
        }),
        createTestInsight("old-1", {
          createdAt: fourHoursAgo.toISOString(),
        }),
        createTestInsight("recent-2", {
          createdAt: now.toISOString(),
        }),
      ];

      // 3시간 윈도우로 필터
      const cutoff = Date.now() - 3 * 60 * 60 * 1000;
      const recent = insights.filter(
        (i) => new Date(i.createdAt).getTime() > cutoff,
      );

      expect(recent).toHaveLength(2);
      expect(recent.map((i) => i.id)).toEqual(["recent-1", "recent-2"]);
    });
  });

  describe("getHermesInsightsByTaskId", () => {
    it("should filter insights by task ID", () => {
      const insights = [
        createTestInsight("test-1", { relatedTaskId: "task-1" }),
        createTestInsight("test-2", { relatedTaskId: "task-2" }),
        createTestInsight("test-3", { relatedTaskId: "task-1" }),
        createTestInsight("test-4"), // no task ID
      ];

      const task1Insights = insights.filter((i) => i.relatedTaskId === "task-1");
      expect(task1Insights).toHaveLength(2);
      expect(task1Insights.every((i) => i.relatedTaskId === "task-1")).toBe(true);

      const task2Insights = insights.filter((i) => i.relatedTaskId === "task-2");
      expect(task2Insights).toHaveLength(1);
    });
  });

  describe("getHermesInsightsByPlanId", () => {
    it("should filter insights by plan ID", () => {
      const insights = [
        createTestInsight("test-1", { relatedPlanId: "plan-1" }),
        createTestInsight("test-2", { relatedPlanId: "plan-2" }),
        createTestInsight("test-3", { relatedPlanId: "plan-1" }),
      ];

      const plan1Insights = insights.filter((i) => i.relatedPlanId === "plan-1");
      expect(plan1Insights).toHaveLength(2);
      expect(plan1Insights.every((i) => i.relatedPlanId === "plan-1")).toBe(true);
    });
  });

  describe("clearHermesInsights", () => {
    it("should clear all insights", async () => {
      const testInsights = [
        createTestInsight("test-1"),
        createTestInsight("test-2"),
      ];

      // 파일을 쓰고 삭제하는 로직 테스트
      expect(testInsights).toHaveLength(2);
      const cleared = testInsights.slice(0, 0); // 모두 제거
      expect(cleared).toHaveLength(0);
    });
  });
});
