import { ResultReviewPanel } from "@/components/workbench/ResultReviewPanel";

export const metadata = { title: "Result Review — Agent Control Room" };

export default function ResultReviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-8 pt-14">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Result Review</h1>
        <p className="text-text-secondary mt-2">
          에이전트 실행 결과를 붙여넣고, 다음 액션을 확인하세요.
        </p>
      </header>

      <ResultReviewPanel />
    </main>
  );
}
