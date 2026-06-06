/**
 * run_id 생성 유틸 — ACR Kernel
 *
 * PRD 예시 형식: run_20260606_001
 *   run_{YYYYMMDD}_{NNN}
 * NNN은 같은 날짜에 이미 존재하는 run 수 + 1을 3자리 zero-pad 한다.
 */

import type { ExecutionRun } from "./types";

function yyyymmdd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * 오늘 날짜 기준으로 다음 run_id를 만든다. 기존 run 목록을 받아 같은 날짜의
 * 시퀀스를 증가시킨다(테스트 가능하도록 순수 함수로 둔다).
 */
export function generateRunId(existingRuns: Pick<ExecutionRun, "id">[], now: Date = new Date()): string {
  const datePart = yyyymmdd(now);
  const prefix = `run_${datePart}_`;
  const sameDay = existingRuns.filter((r) => r.id.startsWith(prefix));
  const seq = sameDay.length + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

/**
 * PRD branch naming: agent/{taskId}-{runId}
 */
export function generateRunBranch(taskId: string, runId: string): string {
  return `agent/${taskId}-${runId}`;
}
