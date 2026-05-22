/**
 * Risk Classification API
 * Classifies tasks by risk level (Low/Medium/High)
 * Used by orchestration layer before dispatch
 */

import { NextRequest, NextResponse } from "next/server";
import { getRiskClassifier } from "@/lib/orchestration/risk-classifier";
import type { DispatchJob, RiskClassificationResult } from "@/lib/types";

interface ClassificationRequest {
  job: DispatchJob;
}

interface ClassificationResponse {
  classification: RiskClassificationResult;
  approval_required: boolean;
  approval_reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClassificationRequest;

    if (!body.job) {
      return NextResponse.json(
        { error: "job parameter required" },
        { status: 400 }
      );
    }

    const classifier = getRiskClassifier();
    const classification = classifier.classifyJob(body.job);

    const response: ClassificationResponse = {
      classification,
      approval_required: classification.requires_telegram_approval,
      approval_reason: classification.approval_required_reason,
    };

    console.log("[Risk Classification]", {
      taskId: body.job.taskId,
      riskLevel: classification.risk_level,
      requiresApproval: classification.requires_telegram_approval,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Classification Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
