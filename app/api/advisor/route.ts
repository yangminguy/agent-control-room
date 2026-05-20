import { NextResponse } from "next/server";
import { generateAdvisorResponse } from "@/lib/orchestration/advisor-orchestrator";
import { AdvisorInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AdvisorInput;
    if (!body.question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }
    
    const result = await generateAdvisorResponse(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Advisor API error:", error);
    return NextResponse.json(
      { error: "Failed to generate advisor response" },
      { status: 500 }
    );
  }
}
