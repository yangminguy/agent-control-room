/**
 * Agent Capability Detector
 *
 * Shell-based safe detection of local agent CLI availability.
 * No external API calls. Uses execFile with shell:false only.
 *
 * Safety contract:
 * - Only version/path checks are executed
 * - shell: false is mandatory on all execFile calls
 * - All errors (not found, timeout, stderr) resolve to not_detected
 * - hermes is background_worker only
 */

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const EXEC_TIMEOUT_MS = 5000;

export type CapabilityStatus =
  | "executable"        // which claude succeeded + version confirmed
  | "manual_only"       // detected but not auto-executable
  | "not_detected"      // which failed or timed out
  | "background_worker" // hermes only
  | "disabled"          // codex / antigravity: intentionally blocked
  | "available";        // manual-user: always manually available

export interface CapabilityResult {
  agentId: string;
  status: CapabilityStatus;
  version?: string;
  detectedAt: string;  // ISO timestamp
  reason: string;
}

const ANTIGRAVITY_CLI =
  "/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide";

async function detectExecutable(input: {
  agentId: string;
  command: string;
  versionArgs: string[];
  notFoundReason: string;
}): Promise<CapabilityResult> {
  const detectedAt = new Date().toISOString();
  try {
    const { stdout } = await execFileAsync(input.command, input.versionArgs, {
      timeout: EXEC_TIMEOUT_MS,
      shell: false,
    });
    const raw = stdout.trim();
    const match = raw.match(/(\d+\.\d+[\.\d-]*(?:-[a-zA-Z0-9.]+)?)/);
    return {
      agentId: input.agentId,
      status: "executable",
      version: match ? match[1] : raw,
      detectedAt,
      reason: `${input.agentId} executable found: ${input.command}`,
    };
  } catch {
    return {
      agentId: input.agentId,
      status: "not_detected",
      detectedAt,
      reason: input.notFoundReason,
    };
  }
}

/**
 * Detect Claude Code CLI availability on the host machine.
 * Runs `which claude` then `claude --version`.
 */
export async function detectClaudeCapability(): Promise<CapabilityResult> {
  const detectedAt = new Date().toISOString();

  // Step 1: locate the binary
  let claudePath: string;
  try {
    const { stdout } = await execFileAsync("which", ["claude"], {
      timeout: EXEC_TIMEOUT_MS,
      shell: false,
    });
    claudePath = stdout.trim();
    if (!claudePath) {
      return {
        agentId: "claude-code",
        status: "not_detected",
        detectedAt,
        reason: "which claude returned empty output",
      };
    }
  } catch {
    return {
      agentId: "claude-code",
      status: "not_detected",
      detectedAt,
      reason: "which claude failed: binary not found or timed out",
    };
  }

  // Step 2: confirm the binary runs and parse version
  try {
    const { stdout } = await execFileAsync("claude", ["--version"], {
      timeout: EXEC_TIMEOUT_MS,
      shell: false,
    });
    const raw = stdout.trim();
    // Extract first semver-like number sequence (e.g. "0.3.0" from "Claude CLI version 0.3.0")
    const match = raw.match(/(\d+\.\d+[\.\d]*)/);
    const version = match ? match[1] : raw;

    return {
      agentId: "claude-code",
      status: "executable",
      version,
      detectedAt,
      reason: `Claude Code CLI found at ${claudePath}, version ${version}`,
    };
  } catch {
    return {
      agentId: "claude-code",
      status: "not_detected",
      detectedAt,
      reason: "claude --version failed or timed out after binary was located",
    };
  }
}

/**
 * Detect capability for a named agent.
 * Routes to the appropriate detection logic per agent policy.
 */
export async function detectAgentCapability(
  agentId: string,
): Promise<CapabilityResult> {
  const detectedAt = new Date().toISOString();

  switch (agentId) {
    case "claude-code":
      return detectClaudeCapability();

    case "codex":
      return detectExecutable({
        agentId,
        command: "codex",
        versionArgs: ["--version"],
        notFoundReason: "codex CLI not found or timed out",
      });

    case "antigravity":
      return detectExecutable({
        agentId,
        command: ANTIGRAVITY_CLI,
        versionArgs: ["--version"],
        notFoundReason: "Antigravity IDE CLI not found at the expected app bundle path",
      });

    case "hermes":
      return {
        agentId,
        status: "background_worker",
        detectedAt,
        reason: "Hermes operates as background worker only, not auto-executed",
      };

    case "vibe-kanban":
      return {
        agentId,
        status: "manual_only",
        detectedAt,
        reason: "Vibe Kanban is an execution workbench; local auto-spawn not supported",
      };

    case "manual-user":
      return {
        agentId,
        status: "available",
        detectedAt,
        reason: "Manual user is always available for approval and direction",
      };

    default:
      return {
        agentId,
        status: "not_detected",
        detectedAt,
        reason: `Unknown agentId: ${agentId}`,
      };
  }
}

const ALL_AGENT_IDS = [
  "claude-code",
  "codex",
  "antigravity",
  "hermes",
  "vibe-kanban",
  "manual-user",
] as const;

/**
 * Detect capabilities for all 6 agents in parallel.
 */
export async function detectAllCapabilities(): Promise<
  Record<string, CapabilityResult>
> {
  const results = await Promise.all(
    ALL_AGENT_IDS.map((id) => detectAgentCapability(id)),
  );

  return Object.fromEntries(results.map((r) => [r.agentId, r]));
}
