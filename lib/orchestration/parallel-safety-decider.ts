/**
 * T003: Parallel Safety Decision Engine
 * Phase 2: Multi-Agent Orchestration
 *
 * 역할: 두 개 이상의 작업을 병렬로 실행할 수 있는지 판단한다.
 * 파일 충돌, 공유 타입 파일, 위험한 로직 영역을 감지한다.
 *
 * 규칙:
 * - 같은 파일 수정 → sequential
 * - 공유 타입 파일 → sequential
 * - runner/approval/risk 로직 → sequential
 * - UI만 vs. 백엔드만 → parallel_safe (타입 파일 없으면)
 * - 불명확 → sequential (안전 우선)
 */

import type { AgentType } from "@/lib/types";
import type { NextTaskRecommendation } from "./next-task-generator";

/**
 * 병렬 실행 가능 여부와 이유
 */
export type ParallelSafetyDecision = {
  mode: "single" | "sequential" | "parallel_safe" | "blocked";
  reason: string;                      // 한국어 설명
  conflictRisk: "none" | "low" | "medium" | "high";
  conflictingFiles: string[];          // 겹치는 파일들
  recommendation: string;              // PM을 위한 조언 (한국어)
};

/** 병렬 실행 불가능한 고위험 영역들 */
const CRITICAL_SHARED_AREAS = [
  // 러너 및 승인 시스템
  /lib\/runner/,
  /lib\/approval/,
  /app\/api\/runner/,
  /app\/api\/workbench\/approval/,

  // 오케스트레이션 및 의사결정
  /lib\/orchestration\/(decision-classifier|risk-classifier|status-updater)/,
  /lib\/orchestration\/(approval-gate-builder|task-queue)/,

  // 패킷 및 기록 시스템 (Hermes)
  /lib\/hermes\/packet-builder/,
  /lib\/storage\/(execution-log-store|approval-token-store)/,

  // 타입 시스템 (전체 변경하면 영향 큼)
  /lib\/types\.ts$/,

  // 패키지 및 설정
  /package\.json$/,
  /package-lock\.json$/,
  /tsconfig/,
  /next\.config/,

  // 환경 및 보안
  /\.env/,
  /secret/i,
];

/** 타입 정의와 인터페이스 (변경 시 다른 에이전트 영향)
 */
const TYPE_FILES = [
  /lib\/types\.ts$/,
  /lib\/orchestration\/types\.ts$/,
  /lib\/[^/]*\/types\.ts$/,
];

/** UI 전용 영역들 */
const UI_AREAS = [
  /app\/components\//,
  /app\/.*\/page\.tsx$/,
  /lib\/.*-ui-adapter/,
  /public\//,
];

/** 백엔드 전용 영역들 */
const BACKEND_AREAS = [
  /lib\/(runner|hermes|orchestration|storage|approval)\//,
  /lib\/control-room\//,
  /app\/api\//,
];

/**
 * 파일이 높은 위험 영역에 있는지 확인
 */
function isInCriticalArea(filePath: string): boolean {
  return CRITICAL_SHARED_AREAS.some((pattern) => pattern.test(filePath));
}

/**
 * 파일이 타입 정의 파일인지 확인
 */
function isTypeFile(filePath: string): boolean {
  return TYPE_FILES.some((pattern) => pattern.test(filePath));
}

/**
 * 파일이 UI 영역인지 확인
 */
function isUIArea(filePath: string): boolean {
  return UI_AREAS.some((pattern) => pattern.test(filePath));
}

/**
 * 파일이 백엔드 영역인지 확인
 */
function isBackendArea(filePath: string): boolean {
  return BACKEND_AREAS.some((pattern) => pattern.test(filePath));
}

/**
 * 파일 목록에서 겹치는 부분 찾기
 */
function findConflictingFiles(
  files1: string[] = [],
  files2: string[] = [],
): string[] {
  return files1.filter((f1) =>
    files2.some((f2) => {
      // 정확한 일치
      if (f1 === f2) return true;
      // 패턴 매칭: a/* vs a/b
      if (f1.endsWith("/*") && f2.startsWith(f1.slice(0, -2))) return true;
      if (f2.endsWith("/*") && f1.startsWith(f2.slice(0, -2))) return true;
      // 동일 디렉토리
      const dir1 = f1.split("/").slice(0, -1).join("/");
      const dir2 = f2.split("/").slice(0, -1).join("/");
      return dir1 === dir2 && dir1.length > 0;
    }),
  );
}

/**
 * 두 작업의 병렬 실행 가능 여부를 판단한다.
 *
 * @param task1 첫 번째 작업
 * @param task2 두 번째 작업 (미래에 실행될 예정인 작업)
 * @returns 병렬 실행 결정
 */
export function decideParallelSafety(
  task1: NextTaskRecommendation,
  task2: NextTaskRecommendation,
): ParallelSafetyDecision {
  const files1 = task1.allowedFiles ?? [];
  const files2 = task2.allowedFiles ?? [];

  // 1. 둘 다 고위험 영역을 건드리면 → sequential
  const task1InCritical = files1.some(isInCriticalArea);
  const task2InCritical = files2.some(isInCriticalArea);
  if (task1InCritical || task2InCritical) {
    return {
      mode: "sequential",
      reason:
        "고위험 시스템 영역(runner, approval, 의사결정)을 건드리므로 순차 실행만 안전합니다.",
      conflictRisk: "high",
      conflictingFiles: [
        ...files1.filter(isInCriticalArea),
        ...files2.filter(isInCriticalArea),
      ],
      recommendation:
        "이 두 작업은 순차적으로 실행해야 합니다. 시스템 안정성을 위해 이전 작업 완료 후 다음 작업을 실행하세요.",
    };
  }

  // 2. 파일이 정확히 겹치면 → sequential
  const conflictingFiles = findConflictingFiles(files1, files2);
  if (conflictingFiles.length > 0) {
    return {
      mode: "sequential",
      reason: `다음 파일이 겹칩니다: ${conflictingFiles.join(", ")}. 파일 충돌 위험이 있습니다.`,
      conflictRisk: "high",
      conflictingFiles,
      recommendation: `'${task1.title}'이(가) 완료된 후 '${task2.title}'을(를) 실행하세요.`,
    };
  }

  // 3. 둘 다 타입 파일을 건드리면 → sequential
  const task1TypeFiles = files1.filter(isTypeFile);
  const task2TypeFiles = files2.filter(isTypeFile);
  if (task1TypeFiles.length > 0 && task2TypeFiles.length > 0) {
    return {
      mode: "sequential",
      reason:
        "둘 다 타입 파일을 수정하므로 순차 실행이 필요합니다. 타입 일관성을 보장하기 위해 한 번에 하나씩 실행하세요.",
      conflictRisk: "medium",
      conflictingFiles: [...task1TypeFiles, ...task2TypeFiles],
      recommendation:
        "타입 시스템 일관성을 위해 한 작업씩 완료한 후 다음 작업을 실행하세요.",
    };
  }

  // 4. 하나만 타입 파일을 건드리고 다른 하나가 그를 사용하면 → sequential
  if ((task1TypeFiles.length > 0 || task2TypeFiles.length > 0) && conflictingFiles.length === 0) {
    // 타입 변경 후 다른 영역의 작업은 sequential
    if (task1TypeFiles.length > 0 || task2TypeFiles.length > 0) {
      return {
        mode: "sequential",
        reason:
          "타입 파일 변경으로 인한 잠재적 의존성 문제. 순차 실행으로 안정성을 보장합니다.",
        conflictRisk: "medium",
        conflictingFiles: [...task1TypeFiles, ...task2TypeFiles],
        recommendation:
          "타입 변경 후 다른 작업을 실행할 때는 순차적으로 진행하고, 각 단계마다 타입 체크를 실행하세요.",
      };
    }
  }

  // 5. 기다려라: 고위험 작업이면 다른 작업과 함께 실행 불가
  if (["high", "critical"].includes(task1.riskLevel) ||
      ["high", "critical"].includes(task2.riskLevel)) {
    const riskTask = ["high", "critical"].includes(task1.riskLevel) ? task1 : task2;
    return {
      mode: "sequential",
      reason: `'${riskTask.title}' 작업의 위험도가 높아서 순차 실행이 필수입니다.`,
      conflictRisk: "high",
      conflictingFiles: [],
      recommendation:
        "고위험 작업은 완료된 후 다음 작업을 실행합니다. 각 단계마다 결과를 검증하세요.",
    };
  }

  // 6. UI vs. 백엔드 분리 → parallel_safe (타입 파일 없으면)
  const task1IsUI = files1.some(isUIArea);
  const task2IsUI = files2.some(isUIArea);
  const task1IsBackend = files1.some(isBackendArea);
  const task2IsBackend = files2.some(isBackendArea);

  if ((task1IsUI && !task1IsBackend && task2IsBackend && !task2IsUI) ||
      (task1IsBackend && !task1IsUI && task2IsUI && !task2IsBackend)) {
    // 완전히 분리되고, 타입 파일이 없으면
    if (task1TypeFiles.length === 0 && task2TypeFiles.length === 0) {
      return {
        mode: "parallel_safe",
        reason: `'${task1.title}'은 UI를 수정하고 '${task2.title}'은 백엔드를 수정합니다. 파일 분리가 명확하므로 병렬 실행이 안전합니다.`,
        conflictRisk: "none",
        conflictingFiles: [],
        recommendation:
          "이 두 작업은 병렬로 실행 가능합니다. 각각 다른 영역을 수정하므로 충돌 위험이 없습니다.",
      };
    }
  }

  // 7. 기본값: 불명확하면 sequential (안전 우선)
  return {
    mode: "sequential",
    reason: "명확한 파일 분리가 불가능하거나 의존성이 불명확합니다. 안전을 위해 순차 실행을 권장합니다.",
    conflictRisk: "low",
    conflictingFiles: conflictingFiles,
    recommendation:
      "이 두 작업은 순차적으로 실행하는 것이 더 안전합니다. 첫 번째 작업 완료 후 두 번째 작업을 시작하세요.",
  };
}

/**
 * 단일 작업의 실행 모드를 결정한다 (다른 작업과의 병렬 실행이 아닌 경우)
 */
export function decideSingleTaskExecutionMode(
  task: NextTaskRecommendation,
): "single" | "sequential" | "blocked" {
  // 차단된 작업
  if (task.executionMode === "blocked") {
    return "blocked";
  }

  // 고위험 작업
  if (["high", "critical"].includes(task.riskLevel)) {
    return "sequential";
  }

  // 기본: single
  return "single";
}
