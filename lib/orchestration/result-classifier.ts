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
}

export function classifyResult(rawResult: string): ResultClassification {
  const lower = rawResult.toLowerCase();

  if (lower.includes("error") || lower.includes("failed") || lower.includes("blocked")) {
    return "Blocked";
  }

  if (lower.includes("completed") || lower.includes("success") || lower.includes("passed")) {
    return "Pass";
  }

  if (lower.includes("partial") || lower.includes("mostly")) {
    return "MinorFix";
  }

  if (lower.includes("test") || lower.includes("review") || lower.includes("qa")) {
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
  void context;
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
      return [
        "Claude Code로 실패 원인 분석",
        "Retry Candidate 등록",
        "Context Pack 생성 후 재시도",
      ];
  }
}
