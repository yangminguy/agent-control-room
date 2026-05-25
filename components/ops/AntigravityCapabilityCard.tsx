"use client";

export type AgtSwitchCapability = "config_write" | "tty" | "unsupported";
export type AgtReadiness = "ready" | "degraded" | "not_found";

export interface AntigravityCapabilityCardProps {
  currentModel: string | null;
  switchCapability: AgtSwitchCapability;
  failureReason?: string;
  binaryPath: string | null;
  readiness: AgtReadiness;
}

const READINESS_CARD: Record<AgtReadiness, string> = {
  ready: "border-green-300 bg-green-50",
  degraded: "border-yellow-300 bg-yellow-50",
  not_found: "border-red-300 bg-red-50",
};

const READINESS_LABEL: Record<AgtReadiness, string> = {
  ready: "Ready",
  degraded: "Degraded",
  not_found: "Not Found",
};

const READINESS_BADGE: Record<AgtReadiness, string> = {
  ready: "bg-green-100 text-green-800 border-green-300",
  degraded: "bg-yellow-100 text-yellow-800 border-yellow-300",
  not_found: "bg-red-100 text-red-800 border-red-300",
};

const CAPABILITY_LABEL: Record<AgtSwitchCapability, string> = {
  config_write: "Config Write",
  tty: "TTY",
  unsupported: "Unsupported",
};

const CAPABILITY_BADGE: Record<AgtSwitchCapability, string> = {
  config_write: "bg-blue-100 text-blue-800 border-blue-200",
  tty: "bg-indigo-100 text-indigo-800 border-indigo-200",
  unsupported: "bg-red-100 text-red-800 border-red-200",
};

interface RowProps {
  label: string;
  children: React.ReactNode;
}

function Row({ label, children }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="shrink-0 font-medium text-text-secondary">{label}</span>
      <span className="text-right text-text-primary">{children}</span>
    </div>
  );
}

export function AntigravityCapabilityCard({
  currentModel,
  switchCapability,
  failureReason,
  binaryPath,
  readiness,
}: AntigravityCapabilityCardProps) {
  return (
    <div
      className={`rounded-xl border-2 p-5 flex flex-col gap-4 ${READINESS_CARD[readiness]}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Antigravity Capability</h2>
        <span
          className={`rounded border px-2 py-0.5 text-[10px] font-bold ${READINESS_BADGE[readiness]}`}
        >
          {READINESS_LABEL[readiness]}
        </span>
      </div>

      {/* Detail rows */}
      <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-white/60 p-3">
        <Row label="Current Model">
          {currentModel ? (
            <span className="font-mono text-[11px]">{currentModel}</span>
          ) : (
            <span className="italic text-text-secondary">unknown</span>
          )}
        </Row>

        <Row label="Switch Capability">
          <span
            className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${CAPABILITY_BADGE[switchCapability]}`}
          >
            {CAPABILITY_LABEL[switchCapability]}
          </span>
        </Row>

        <Row label="Binary Path">
          {binaryPath ? (
            <span className="font-mono text-[11px] break-all">{binaryPath}</span>
          ) : (
            <span className="italic text-red-600 text-[11px]">not found</span>
          )}
        </Row>
      </div>

      {/* Failure reason — only shown when capability is unsupported */}
      {switchCapability === "unsupported" && failureReason && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span className="font-semibold">Failure reason: </span>
          {failureReason}
        </div>
      )}

      {/* General degraded warning */}
      {readiness === "degraded" && switchCapability !== "unsupported" && (
        <div className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
          Antigravity is running in a degraded state. Model switching may be unreliable.
        </div>
      )}
    </div>
  );
}
