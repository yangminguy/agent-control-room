import { NextRequest, NextResponse } from "next/server";
import { contactUserViaHermes, type MonitorContactRequest } from "@/lib/monitor/monitor-contact-bridge";

const VALID_KINDS = new Set(["status", "approval", "warning", "failure"]);
const VALID_RISK_LEVELS = new Set(["safe", "low", "medium", "high", "critical"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MonitorContactRequest;

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { success: false, error: "message parameter required" },
        { status: 400 }
      );
    }

    if (body.kind && !VALID_KINDS.has(body.kind)) {
      return NextResponse.json(
        { success: false, error: "invalid contact kind" },
        { status: 400 }
      );
    }

    if (body.riskLevel && !VALID_RISK_LEVELS.has(body.riskLevel)) {
      return NextResponse.json(
        { success: false, error: "invalid risk level" },
        { status: 400 }
      );
    }

    const result = await contactUserViaHermes(body);

    return NextResponse.json({
      success: result.success,
      channel: result.channel,
      fallback_used: result.fallbackUsed,
      message: result.message,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
