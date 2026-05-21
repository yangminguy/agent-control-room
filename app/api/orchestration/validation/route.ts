import { NextRequest, NextResponse } from "next/server";
import { HermesValidationRequest } from "@/lib/types";
import { getHermesValidator } from "@/lib/hermes/hermes-llm-validator";
import { getValidationStore } from "@/lib/storage/validation-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationRequest = body as HermesValidationRequest;

    if (!validationRequest.id || !validationRequest.planId) {
      return NextResponse.json(
        { error: "Missing required fields: id, planId" },
        { status: 400 }
      );
    }

    // Save request
    const store = getValidationStore();
    await store.saveValidationRequest(validationRequest);

    // Perform validation
    const validator = getHermesValidator();
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
