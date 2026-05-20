import { synthesizeExecutionPatterns, adjustAgentScoreByPattern } from "@/lib/knowledge/pattern-synthesis";

export async function POST(req: Request) {
  try {
    const { executionHistory } = await req.json();

    if (!Array.isArray(executionHistory)) {
      return Response.json(
        { error: "executionHistory must be an array" },
        { status: 400 },
      );
    }

    // Synthesize patterns from history
    const pattern = synthesizeExecutionPatterns(executionHistory);

    return Response.json({
      success: true,
      patterns: pattern.patterns,
      metrics: pattern.metrics,
      insights: pattern.insights,
      recommendations: pattern.recommendations,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Pattern synthesis failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json({
    info: "POST execution history to analyze patterns",
    example: {
      executionHistory: [
        {
          agent_id: "ui-designer",
          task_type: "ui-design",
          success: true,
          timeMinutes: 45,
          tokensUsed: 12000,
        },
      ],
    },
  });
}
