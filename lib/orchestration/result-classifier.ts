export type ResultClassification = "Pass" | "MinorFix" | "QA" | "Blocked";

export interface ReviewedResult {
  taskId?: string;
  rawResult: string;
  classification: ResultClassification;
  changedFiles: string[];
  summary: string;
  nextActions: string[];
  suggestedAgent?: string;
  retryCandidate: boolean;
  decisionNeeded?: string;
  unblockAction?: string;
  recommendedNextAgent?: string;
  userApprovalRequired?: boolean;
}

export function classifyResult(rawResult: string): ResultClassification {
  const lower = rawResult.toLowerCase();

  if (
    includesAny(lower, [
      "forbidden file",
      "do-not-touch",
      "do not touch",
      "boundary violation",
      "review_blocked",
      "review-blocked",
      "safety violation",
      "unsafe action",
      "changed package.json",
      "changed .env",
    ])
  ) {
    return "Blocked";
  }

  if (
    includesAny(lower, ["blocked", "pending user decision", "user decision", "needs decision"])
  ) {
    return "Blocked";
  }

  if (
    includesAny(lower, ["tests failed", "test failed", "failing tests", "build failed", "lint failed"]) ||
    /\bfailed\b/.test(lower) ||
    /\berror\b/.test(lower)
  ) {
    return "Blocked";
  }

  if (
    includesAny(lower, [
      "mostly complete but needs qa",
      "mostly completed but needs qa",
      "build passed but manual qa needed",
      "manual qa needed",
      "needs qa",
      "needs review",
      "qa needed",
    ])
  ) {
    return "QA";
  }

  if (includesAny(lower, ["partial implementation", "partially implemented", "partial", "mostly complete", "mostly completed"])) {
    return "MinorFix";
  }

  if (includesAny(lower, ["completed", "success", "passed", "done"])) {
    return "Pass";
  }

  if (includesAny(lower, ["test", "review", "qa"])) {
    return "QA";
  }

  return "QA";
}

export function extractChangedFilesFromResult(rawResult: string): string[] {
  const filePattern = /([a-zA-Z0-9_./\-]+\.(ts|tsx|js|jsx|py|go|sql|json|md))/g;
  return (rawResult.match(filePattern) || []).filter((f, i, arr) => arr.indexOf(f) === i);
}

export function generateNextActions(
  classification: ResultClassification,
  context?: string
): string[] {
  const lower = (context ?? "").toLowerCase();
  switch (classification) {
    case "Pass":
      return [
        "작업 완료. 다음 태스크로 진행.",
        "인사이트 저장 (Obsidian)",
        "로드맵 상태 업데이트",
      ];
    case "MinorFix":
      return [
        "Codex로 수정 (또는 Claude Code)",
        "변경 파일 확인",
        "수정 후 재시도",
      ];
    case "QA":
      return [
        "Codex 코드 리뷰 실행",
        "테스트 결과 확인",
        "QA 통과 시 다음 단계",
      ];
    case "Blocked":
      if (includesAny(lower, ["forbidden file", "boundary violation", "do-not-touch", "do not touch"])) {
        return [
          "Decision needed: approve or reject the out-of-bound file changes.",
          "Unblock action: review the forbidden files and ask an agent to manually fix or revert the scope drift.",
          "Recommended next agent: Claude Code for boundary review, Codex for a bounded cleanup after approval.",
          "User approval required: yes.",
        ];
      }
      if (includesAny(lower, ["user decision", "needs decision", "pending user decision"])) {
        return [
          "Decision needed: choose the product or technical direction blocking the task.",
          "Unblock action: answer the decision question, then regenerate the next-session prompt.",
          "Recommended next agent: Claude Code.",
          "User approval required: yes.",
        ];
      }
      return [
        "Decision needed: confirm whether to retry, narrow scope, or hand off.",
        "Unblock action: inspect failure details, create a Context Pack if context is long, then retry only after approval.",
        "Recommended next agent: Claude Code.",
        "User approval required: yes.",
      ];
  }
}

function includesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}
