/**
 * Risk Classification API
 * Classifies tasks by risk level (Low/Medium/High)
 * Used by orchestration layer before dispatch
 */

import { NextRequest, NextResponse } from "next/server";
import { getRiskClassifier } from "@/lib/orchestration/risk-classifier";
import { contactUserViaHermes } from "@/lib/monitor/monitor-contact-bridge";
import type { DispatchJob, RiskClassificationResult } from "@/lib/types";

interface ClassificationRequest {
  job: DispatchJob;
  notify?: boolean;
}

interface ClassificationResponse {
  classification: RiskClassificationResult;
  approval_required: boolean;
  approval_reason?: string;
  notification?: {
    sent: boolean;
    channel: string;
    message: string;
  };
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

    if (body.notify && classification.requires_telegram_approval) {
      const notification = await contactUserViaHermes({
        kind: "approval",
        taskId: body.job.taskId,
        taskName: body.job.id,
        riskLevel: classification.risk_level,
        reason: classification.approval_required_reason,
        affectedFiles: classification.conflicting_files,
        recommendation: classification.recommendations?.join("\n"),
        message:
          "High-risk work needs your Telegram decision before it can move forward.",
      });

      response.notification = {
        sent: notification.success,
        channel: notification.channel,
        message: notification.message,
      };
    }

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
