import { getAntigravityModelSwitchCapability } from "@/lib/agents/antigravity-model-detection";

export const runtime = "nodejs";

// GET /api/ops/antigravity — returns current model and switch capability
export async function GET() {
  try {
    const capability = getAntigravityModelSwitchCapability();

    const currentModel = capability.currentModel ?? null;
    const binaryPath = capability.binaryPath ?? null;

    let readiness: "ready" | "degraded" | "not_found" = "not_found";
    if (capability.canDetectCurrentModel && capability.canSwitchAutomatically) {
      readiness = "ready";
    } else if (binaryPath) {
      readiness = "degraded";
    }

    const switchCapability: "config_write" | "tty" | "unsupported" =
      capability.switchMethod === "config_write"
        ? "config_write"
        : capability.switchMethod === "tty"
          ? "tty"
          : "unsupported";

    return Response.json({
      currentModel,
      switchCapability,
      binaryPath,
      readiness,
      failureReason: capability.failureReason ?? null,
      lastCheckedAt: capability.lastCheckedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
