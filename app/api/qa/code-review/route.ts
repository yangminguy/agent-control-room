import { runAutomatedCodeReview, formatCodeReviewForDisplay } from "@/lib/qa/code-review-pipeline";
import type { DiffAnalysisOutput } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const diffOutput: DiffAnalysisOutput = await req.json();

    // Run automated code review
    const review = await runAutomatedCodeReview(diffOutput);

    // Format for display
    const displayText = formatCodeReviewForDisplay(review);

    return Response.json({
      success: true,
      review,
      displayText,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Code review failed",
      },
      { status: 500 },
    );
  }
}
