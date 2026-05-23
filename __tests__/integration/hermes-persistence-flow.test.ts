/**
 * Integration test: Hermes Insight Persistence Flow
 *
 * 테스트 케이스:
 * 1. Insight 생성 → 메모리 저장
 * 2. flushToFile() → 로컬 파일 저장
 * 3. loadFromFile() → 파일에서 다시 로드
 * 4. 중복 감지 → frequency 증가
 * 5. 앱 재시작 후 persistence 확인
 */

import { HermesInsightRecorder, type HermesInsight } from "@/lib/hermes/insight-recorder";
import {
  readHermesInsights,
  writeHermesInsights,
  getAllHermesInsights,
  getHermesInsightsBySeverity,
  getRecentHermesInsights,
  clearHermesInsights,
} from "@/lib/storage/hermes-insight-store";
import {
  recordExecutionInsights,
  getAllInsights,
  getInsightsBySeverity,
  getRecentInsights,
  getCriticalInsights,
  getInsightsByTaskId,
} from "@/lib/hermes/insight-lifecycle";
import type { ExecutionResultSummary, DecisionClassification, PlanTask } from "@/lib/types";

// 테스트용 생성 함수들
function createMockTask(id: string): PlanTask {
  return {
    id,
    planId: "plan-1",
    title: `Test task ${id}`,
    description: "Test task",
    status: "running",
    assignedAgent: "claude-code",
    priority: "P0",
    acceptanceCriteria: [],
    subAgentTracks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createMockExecutionResult(taskId: string): ExecutionResultSummary {
  return {
    planId: "plan-1",
    taskId,
    assignedAgent: "claude-code",
    status: "done",
    logSummary: "Completed",
    changedFiles: ["src/test.ts"],
    checksRun: {
      typecheck: "passed",
      lint: "passed",
      test: "passed",
      build: "passed",
    },
    recommendedNextAction: "continue",
  };
}

function createMockDecision(): DecisionClassification {
  return {
    decision: "pass",
    reason: "All checks passed",
    confidence: 100,
    nextAction: "proceed_to_next_task",
  };
}

describe("Hermes Insight Persistence Flow", () => {
  beforeEach(async () => {
    // 테스트 전 모든 insights 초기화
    await clearHermesInsights();
  });

  describe("1. Memory → File → Memory Flow", () => {
    it("should persist insights from memory to file and back", async () => {
      const recorder = new HermesInsightRecorder(true);

      // Step 1: 메모리에 insight 추가
      const insight1: HermesInsight = {
        id: "test-1",
        createdAt: new Date().toISOString(),
        source: "execution_result",
        summary: "Test insight 1",
        details: "Details",
        evidence: ["evidence-1"],
        recommendation: "Fix it",
        severity: "critical",
      };

      recorder.recordInsight(insight1);
      expect(recorder.getAllInsights()).toHaveLength(1);

      // Step 2: 파일에 저장
      await recorder.flushToFile();

      // Step 3: 새로운 레코더로 파일에서 로드
      const recorder2 = new HermesInsightRecorder(true);
      await recorder2.loadFromFile();

      const loadedInsights = recorder2.getAllInsights();
      expect(loadedInsights).toHaveLength(1);
      expect(loadedInsights[0].summary).toBe("Test insight 1");
      expect(loadedInsights[0].severity).toBe("critical");
    });
  });

  describe("2. Duplicate Detection Across Sessions", () => {
    it("should detect and aggregate duplicates when loading from file", async () => {
      // Session 1: 같은 insight 두 번 생성
      const recorder1 = new HermesInsightRecorder(true);

      const insight: HermesInsight = {
        id: "dup-1",
        createdAt: new Date().toISOString(),
        source: "execution_result",
        summary: "Repeated error",
        details: "Details",
        evidence: ["error-1"],
        recommendation: "Fix",
        severity: "warning",
        patternType: "repeated_failure",
        frequency: 1,
      };

      recorder1.recordInsight(insight);
      recorder1.recordInsight({
        ...insight,
        id: "dup-2",
        evidence: ["error-2"],
      });

      expect(recorder1.getAllInsights()).toHaveLength(1);
      expect(recorder1.getAllInsights()[0].frequency).toBe(2);

      await recorder1.flushToFile();

      // Session 2: 파일에서 로드하고 또 다시 같은 insight 추가
      const recorder2 = new HermesInsightRecorder(true);
      await recorder2.loadFromFile();
      expect(recorder2.getAllInsights()).toHaveLength(1);
      expect(recorder2.getAllInsights()[0].frequency).toBe(2);

      // 또 다시 같은 패턴의 insight 추가
      recorder2.recordInsight({
        ...insight,
        id: "dup-3",
        evidence: ["error-3"],
      });

      expect(recorder2.getAllInsights()).toHaveLength(1);
      expect(recorder2.getAllInsights()[0].frequency).toBe(3);
      expect(recorder2.getAllInsights()[0].evidence).toHaveLength(3);
    });
  });

  describe("3. ExecutionResult Integration", () => {
    it("should generate and persist insights from execution result", async () => {
      const task = createMockTask("task-1");
      const executionResult: ExecutionResultSummary = {
        ...createMockExecutionResult("task-1"),
        changedFiles: [".env", "src/test.ts"], // 경계 위반
        doNotTouchFiles: [".env", "secrets/*"],
      };
      const decision = createMockDecision();

      // 실행 결과로부터 insights 생성 및 저장
      const newInsights = await recordExecutionInsights(
        executionResult,
        decision,
        task,
      );

      expect(newInsights.length).toBeGreaterThan(0);

      // 파일에서 insights 읽기
      const persisted = await getAllHermesInsights();
      expect(persisted.length).toBeGreaterThan(0);

      // critical insight 확인
      const critical = persisted.filter((i) => i.severity === "critical");
      expect(critical.length).toBeGreaterThan(0);
    });
  });

  describe("4. Filtering and Querying", () => {
    it("should filter insights by severity across persistence", async () => {
      // 다양한 심각도의 insights 생성
      const insights: HermesInsight[] = [
        {
          id: "critical-1",
          createdAt: new Date().toISOString(),
          source: "execution_result",
          summary: "Critical issue",
          details: "Details",
          evidence: [],
          recommendation: "Fix immediately",
          severity: "critical",
        },
        {
          id: "warning-1",
          createdAt: new Date().toISOString(),
          source: "execution_result",
          summary: "Warning issue",
          details: "Details",
          evidence: [],
          recommendation: "Check it",
          severity: "warning",
        },
        {
          id: "info-1",
          createdAt: new Date().toISOString(),
          source: "execution_result",
          summary: "Info message",
          details: "Details",
          evidence: [],
          recommendation: "FYI",
          severity: "info",
        },
      ];

      await writeHermesInsights(insights);

      const criticals = await getHermesInsightsBySeverity("critical");
      expect(criticals).toHaveLength(1);
      expect(criticals[0].summary).toBe("Critical issue");

      const warnings = await getHermesInsightsBySeverity("warning");
      expect(warnings).toHaveLength(1);

      const infos = await getHermesInsightsBySeverity("info");
      expect(infos).toHaveLength(1);
    });

    it("should filter insights by time window", async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

      const insights: HermesInsight[] = [
        {
          id: "recent-1",
          createdAt: twoHoursAgo.toISOString(),
          source: "execution_result",
          summary: "Recent insight",
          details: "Details",
          evidence: [],
          recommendation: "Action",
          severity: "warning",
        },
        {
          id: "old-1",
          createdAt: fourHoursAgo.toISOString(),
          source: "execution_result",
          summary: "Old insight",
          details: "Details",
          evidence: [],
          recommendation: "Action",
          severity: "warning",
        },
      ];

      await writeHermesInsights(insights);

      // 3시간 윈도우
      const recent = await getRecentHermesInsights(3);
      expect(recent).toHaveLength(1);
      expect(recent[0].summary).toBe("Recent insight");

      // 5시간 윈도우
      const all = await getRecentHermesInsights(5);
      expect(all).toHaveLength(2);
    });
  });

  describe("5. Lifecycle Manager Integration", () => {
    it("should use lifecycle manager to get critical insights", async () => {
      const insights: HermesInsight[] = [
        {
          id: "crit-1",
          createdAt: new Date().toISOString(),
          source: "execution_result",
          summary: "Critical 1",
          details: "Details",
          evidence: [],
          recommendation: "Fix",
          severity: "critical",
        },
        {
          id: "warn-1",
          createdAt: new Date().toISOString(),
          source: "execution_result",
          summary: "Warning 1",
          details: "Details",
          evidence: [],
          recommendation: "Check",
          severity: "warning",
        },
      ];

      await writeHermesInsights(insights);

      const critical = await getCriticalInsights();
      expect(critical).toHaveLength(1);
      expect(critical[0].summary).toBe("Critical 1");
    });
  });

  describe("6. Task and Plan Relationships", () => {
    it("should filter insights by task ID", async () => {
      const insights: HermesInsight[] = [
        {
          id: "task1-insight1",
          createdAt: new Date().toISOString(),
          source: "execution_result",
          summary: "Task 1 issue",
          details: "Details",
          evidence: [],
          recommendation: "Fix",
          severity: "warning",
          relatedTaskId: "task-1",
        },
        {
          id: "task2-insight1",
          createdAt: new Date().toISOString(),
          source: "execution_result",
          summary: "Task 2 issue",
          details: "Details",
          evidence: [],
          recommendation: "Fix",
          severity: "warning",
          relatedTaskId: "task-2",
        },
        {
          id: "task1-insight2",
          createdAt: new Date().toISOString(),
          source: "execution_result",
          summary: "Task 1 issue 2",
          details: "Details",
          evidence: [],
          recommendation: "Fix",
          severity: "critical",
          relatedTaskId: "task-1",
        },
      ];

      await writeHermesInsights(insights);

      const task1Insights = await getInsightsByTaskId("task-1");
      expect(task1Insights).toHaveLength(2);
      expect(task1Insights.every((i) => i.relatedTaskId === "task-1")).toBe(true);
    });
  });
});
