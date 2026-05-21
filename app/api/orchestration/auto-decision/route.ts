import { NextRequest, NextResponse } from "next/server";
import { AutoDecisionLog } from "@/lib/types";
import { getAutoDecisionEngine } from "@/lib/hermes/auto-decision-engine";
import { getValidationStore } from "@/lib/storage/validation-store";

export type AutoDecisionRequest = {
  validationId: string;
  autoApproveThreshold?: number;
  requireUserConfirmation?: boolean;
};

export type UserApprovalRequest = {
  decisionId: string;
  approved: boolean;
  note?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if it's a decision request or user approval
    if (body.decisionId) {
      // User approval
      return handleUserApproval(body as UserApprovalRequest);
    } else {
      // Auto decision
      return handleAutoDecision(body as AutoDecisionRequest);
    }
  } catch (error) {
    console.error("[auto-decision API] Error:", error);
    return NextResponse.json(
      { error: "Auto-decision failed", details: String(error) },
      { status: 500 }
    );
  }
}

async function handleAutoDecision(req: AutoDecisionRequest) {
  const { validationId, autoApproveThreshold = 75, requireUserConfirmation = false } = req;

  if (!validationId) {
    return NextResponse.json(
      { error: "Missing validationId" },
      { status: 400 }
    );
  }

  const store = getValidationStore();
  const validationResult = await store.getValidationResult(validationId);

  if (!validationResult) {
    return NextResponse.json(
      { error: "Validation not found" },
      { status: 404 }
    );
  }

  const engine = getAutoDecisionEngine();
  const outcome = engine.makeDecision({
    validationId,
    validationResult,
    autoApproveThreshold,
    requireUserConfirmation,
  });

  // Save decision
  await store.saveAutoDecisionLog(outcome.decisionLog);

  return NextResponse.json(
    {
      decision: outcome.decision,
      reasoning: outcome.reasoning,
      decisionLog: outcome.decisionLog,
    },
    { status: 200 }
  );
}

async function handleUserApproval(req: UserApprovalRequest) {
  const { decisionId, approved, note } = req;

  if (!decisionId) {
    return NextResponse.json(
      { error: "Missing decisionId" },
      { status: 400 }
    );
  }

  const store = getValidationStore();
  const decisionLog = await store.getAutoDecisionLog(decisionId);

  if (!decisionLog) {
    return NextResponse.json(
      { error: "Decision not found" },
      { status: 404 }
    );
  }

  const engine = getAutoDecisionEngine();
  const updated = engine.recordUserApproval(decisionLog, approved, note);

  // Save updated decision
  await store.saveAutoDecisionLog(updated);

  return NextResponse.json(
    {
      decisionLog: updated,
      message: approved ? "Approval confirmed" : "Rejection confirmed",
    },
    { status: 200 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const validationId = searchParams.get("validationId");

    const store = getValidationStore();

    if (validationId) {
      const decisions = await store.getAutoDecisionLogsByValidation(validationId);
      return NextResponse.json(decisions, { status: 200 });
    }

    // Return stats
    const engine = getAutoDecisionEngine();
    const stats = engine.getAutoApprovalStats();

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error("[auto-decision API] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch decisions", details: String(error) },
      { status: 500 }
    );
  }
}
