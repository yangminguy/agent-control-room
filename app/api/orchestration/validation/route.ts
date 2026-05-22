import { NextRequest, NextResponse } from "next/server";
import { MonitorValidationRequest } from "@/lib/types";
import { getMonitorValidator } from "@/lib/monitor/monitor-llm-validator";
import { getValidationStore } from "@/lib/storage/validation-store";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseValidationRequest(value: unknown): MonitorValidationRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const body = value as Record<string, unknown>;
  if (
    typeof body.id !== "string" ||
    body.id.trim() === "" ||
    typeof body.planId !== "string" ||
    body.planId.trim() === "" ||
    typeof body.stageIndex !== "number" ||
    !Number.isInteger(body.stageIndex) ||
    body.stageIndex < 0 ||
    typeof body.stageName !== "string" ||
    body.stageName.trim() === "" ||
    !isStringArray(body.acceptanceCriteria) ||
    body.acceptanceCriteria.length === 0 ||
    !isStringArray(body.completedWork) ||
    typeof body.contextSummary !== "string" ||
    typeof body.timestamp !== "string"
  ) {
    return null;
  }

  if (body.riskFlags !== undefined && !isStringArray(body.riskFlags)) {
    return null;
  }

  return {
    id: body.id,
    planId: body.planId,
    stageIndex: body.stageIndex,
    stageName: body.stageName,
    acceptanceCriteria: body.acceptanceCriteria,
    completedWork: body.completedWork,
    contextSummary: body.contextSummary,
    riskFlags: body.riskFlags,
    timestamp: body.timestamp,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationRequest = parseValidationRequest(body);

    if (!validationRequest) {
      return NextResponse.json(
        { error: "Invalid validation request payload" },
        { status: 400 }
      );
    }

    // Save request
    const store = getValidationStore();
    await store.saveValidationRequest(validationRequest);

    // Perform validation
    const validator = getMonitorValidator();
    const result = await validator.validateStage(validationRequest);

    // Save result
    await store.saveValidationResult(result);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[validation API] Error:", error);
    return NextResponse.json(
      { error: "Validation failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId");
    const stageIndex = searchParams.get("stageIndex");

    const store = getValidationStore();
    const allRequests = await store.getAllValidationRequests();

    let filtered = allRequests;
    if (planId) {
      filtered = filtered.filter((r) => r.planId === planId);
    }
    if (stageIndex) {
      const idx = parseInt(stageIndex, 10);
      filtered = filtered.filter((r) => r.stageIndex === idx);
    }

    return NextResponse.json(filtered, { status: 200 });
  } catch (error) {
    console.error("[validation API] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch validations", details: String(error) },
      { status: 500 }
    );
  }
}
