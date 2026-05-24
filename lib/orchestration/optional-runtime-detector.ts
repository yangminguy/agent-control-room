// OMC/OMX Optional Runtime Detection & Attachment
// Detects if optional runtimes are installed and available

import { execSync } from "child_process";
import fs from "fs";

export type OptionalRuntimeStatus = {
  runtime: "omc" | "omx";
  installed: boolean;
  version?: string;
  binaryPath?: string;
  lastCheckedAt: string;
  smokeTestPassed?: boolean;
  failureReason?: string;
};

export type OptionalRuntimesStatus = {
  omc: OptionalRuntimeStatus;
  omx: OptionalRuntimeStatus;
};

/**
 * Detect if OMC (Claude team orchestration runtime) is installed
 */
export function detectOMCRuntime(): OptionalRuntimeStatus {
  const lastCheckedAt = new Date().toISOString();

  try {
    // Check if 'omc' command exists
    const which = execSync("which omc", { encoding: "utf-8" }).trim();

    if (!which) {
      return {
        runtime: "omc",
        installed: false,
        lastCheckedAt,
        failureReason: "omc binary not found in PATH",
      };
    }

    // Try to get version
    let version: string | undefined;
    try {
      version = execSync("omc --version", { encoding: "utf-8" }).trim();
    } catch {
      // Version check failed, but binary exists
    }

    return {
      runtime: "omc",
      installed: true,
      version,
      binaryPath: which,
      lastCheckedAt,
    };
  } catch (error) {
    return {
      runtime: "omc",
      installed: false,
      lastCheckedAt,
      failureReason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Detect if OMX (Codex executor runtime) is installed
 */
export function detectOMXRuntime(): OptionalRuntimeStatus {
  const lastCheckedAt = new Date().toISOString();

  try {
    // Check if 'omx' command exists
    const which = execSync("which omx", { encoding: "utf-8" }).trim();

    if (!which) {
      return {
        runtime: "omx",
        installed: false,
        lastCheckedAt,
        failureReason: "omx binary not found in PATH",
      };
    }

    // Try to get version
    let version: string | undefined;
    try {
      version = execSync("omx --version", { encoding: "utf-8" }).trim();
    } catch {
      // Version check failed, but binary exists
    }

    return {
      runtime: "omx",
      installed: true,
      version,
      binaryPath: which,
      lastCheckedAt,
    };
  } catch (error) {
    return {
      runtime: "omx",
      installed: false,
      lastCheckedAt,
      failureReason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Run smoke test for OMC runtime
 */
export function smokeTestOMC(binaryPath: string): boolean {
  try {
    const result = execSync(`${binaryPath} health-check`, {
      encoding: "utf-8",
      timeout: 5000,
    });

    return result.includes("healthy") || result.includes("ok");
  } catch (error) {
    return false;
  }
}

/**
 * Run smoke test for OMX runtime
 */
export function smokeTestOMX(binaryPath: string): boolean {
  try {
    const result = execSync(`${binaryPath} health-check`, {
      encoding: "utf-8",
      timeout: 5000,
    });

    return result.includes("healthy") || result.includes("ok");
  } catch (error) {
    return false;
  }
}

/**
 * Get status of all optional runtimes
 */
export function getOptionalRuntimesStatus(): OptionalRuntimesStatus {
  const omc = detectOMCRuntime();
  const omx = detectOMXRuntime();

  // Run smoke tests if installed
  if (omc.installed && omc.binaryPath) {
    omc.smokeTestPassed = smokeTestOMC(omc.binaryPath);
  }

  if (omx.installed && omx.binaryPath) {
    omx.smokeTestPassed = smokeTestOMX(omx.binaryPath);
  }

  return { omc, omx };
}

/**
 * Determine if OMC can be auto-selected for Claude Code tasks
 */
export function isOMCAutoSelectable(): boolean {
  const status = detectOMCRuntime();
  return status.installed && status.smokeTestPassed !== false;
}

/**
 * Determine if OMX can be auto-selected for Codex QA tasks
 */
export function isOMXAutoSelectable(): boolean {
  const status = detectOMXRuntime();
  return status.installed && status.smokeTestPassed !== false;
}

/**
 * Cache optional runtime status in file
 */
export function cacheOptionalRuntimesStatus(): void {
  const status = getOptionalRuntimesStatus();
  const cachePath = ".claude/optional-runtimes-cache.json";

  try {
    const cacheDir = ".claude";
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    fs.writeFileSync(cachePath, JSON.stringify(status, null, 2), "utf-8");
  } catch (error) {
    // Silently fail on cache write errors
  }
}

/**
 * Get cached optional runtimes status
 */
export function getCachedOptionalRuntimesStatus(): OptionalRuntimesStatus | null {
  const cachePath = ".claude/optional-runtimes-cache.json";

  try {
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    // Silently fail on cache read errors
  }

  return null;
}
