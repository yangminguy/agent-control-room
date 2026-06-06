/**
 * Playwright artifact + self-healing locator suggestion — ACR Harness
 * (PRD §14.1 / §14.2).
 *
 * MVP policy (§14.2): on a Playwright failure we do NOT auto-patch anything.
 * We only persist failure artifacts and emit a *suggestion* for a more robust
 * locator. `auto_patch_allowed` is hard-coded to `false` — auto-patch is a
 * later phase (§14.3) gated on confidence ≥ 0.9 + test-only scope + verifier
 * re-pass + human/trusted approval, none of which happens here.
 *
 * Artifact layout (§14.1):
 *   artifacts/runs/{run_id}/
 *     screenshot.png
 *     dom-snapshot.html
 *     playwright-error.txt
 *     locator-suggestion.json
 */

import fs from "fs/promises";
import path from "path";

// ─── §14.2 — locator suggestion ──────────────────────────────────────────────

export type LocatorStrategy = "role" | "label" | "text" | "testid" | "css";

export type LocatorSuggestion = {
  broken_locator: string;
  suggested_locator: string;
  confidence: number;
  strategy: LocatorStrategy;
  /** Always false at this phase (§14.2). Never auto-patch from here. */
  auto_patch_allowed: false;
};

/** Minimal slice of the DOM around the broken element, if captured. */
export type DomContext = {
  /** Outer HTML of the candidate element / nearby subtree. */
  html?: string;
  /** Visible text of the target, if known. */
  text?: string;
  /** ARIA role of the target, if known. */
  role?: string;
  /** Accessible name (aria-label / label text), if known. */
  accessibleName?: string;
  /** data-testid of the target, if known. */
  testId?: string;
};

function escapeName(name: string): string {
  return name.replace(/'/g, "\\'");
}

/**
 * Pure function: given a broken locator and optional DOM context, propose a
 * more resilient locator. No side effects, no auto-patching. Strategy priority
 * (most → least robust): role+name > label > testid > text > css fallback.
 *
 * Confidence reflects how much signal the DOM context gave us; when there is
 * no context at all we still return the broken locator as a low-confidence
 * css "suggestion" so callers always get a well-formed object.
 */
export function generateLocatorSuggestion(
  brokenLocator: string,
  domContext?: DomContext,
): LocatorSuggestion {
  const ctx = domContext ?? {};

  let suggested = brokenLocator;
  let strategy: LocatorStrategy = "css";
  let confidence = 0.1;

  if (ctx.role && ctx.accessibleName) {
    suggested = `page.getByRole('${escapeName(ctx.role)}', { name: '${escapeName(
      ctx.accessibleName,
    )}' })`;
    strategy = "role";
    confidence = 0.88;
  } else if (ctx.accessibleName) {
    suggested = `page.getByLabel('${escapeName(ctx.accessibleName)}')`;
    strategy = "label";
    confidence = 0.78;
  } else if (ctx.testId) {
    suggested = `page.getByTestId('${escapeName(ctx.testId)}')`;
    strategy = "testid";
    confidence = 0.82;
  } else if (ctx.text) {
    suggested = `page.getByText('${escapeName(ctx.text)}')`;
    strategy = "text";
    confidence = 0.6;
  } else if (ctx.role) {
    suggested = `page.getByRole('${escapeName(ctx.role)}')`;
    strategy = "role";
    confidence = 0.4;
  }

  return {
    broken_locator: brokenLocator,
    suggested_locator: suggested,
    confidence,
    strategy,
    auto_patch_allowed: false,
  };
}

// ─── §14.1 — artifact persistence ────────────────────────────────────────────

export type PlaywrightArtifactInput = {
  runId: string;
  /**
   * Root directory under which `artifacts/runs/{runId}/` is created. Injectable
   * so tests isolate to os.tmpdir().
   */
  dir: string;
  /** Raw PNG bytes of the failure screenshot, if captured. */
  screenshot?: Buffer | Uint8Array;
  /** DOM snapshot HTML at failure, if captured. */
  dom?: string;
  /** Playwright error text (message + stack). */
  error: string;
  /**
   * Optional locator suggestion to persist alongside the failure. When the
   * caller already has the broken locator + DOM context they pass the result
   * of generateLocatorSuggestion here; we just serialise it.
   */
  locatorSuggestion?: LocatorSuggestion;
};

export type PlaywrightArtifactResult = {
  /** Absolute path to `artifacts/runs/{runId}/`. */
  artifactDir: string;
  /** Absolute paths of the files actually written (optional inputs omitted). */
  files: string[];
};

/**
 * Persist Playwright failure artifacts under `artifacts/runs/{runId}/`. Only
 * the provided inputs are written: screenshot/dom/locator-suggestion are
 * optional, the error text is always written. Returns written file paths.
 */
export async function savePlaywrightArtifacts(
  input: PlaywrightArtifactInput,
): Promise<PlaywrightArtifactResult> {
  const artifactDir = path.join(input.dir, "artifacts", "runs", input.runId);
  await fs.mkdir(artifactDir, { recursive: true });

  const files: string[] = [];

  if (input.screenshot) {
    const p = path.join(artifactDir, "screenshot.png");
    await fs.writeFile(p, input.screenshot);
    files.push(p);
  }

  if (input.dom !== undefined) {
    const p = path.join(artifactDir, "dom-snapshot.html");
    await fs.writeFile(p, input.dom, "utf8");
    files.push(p);
  }

  const errPath = path.join(artifactDir, "playwright-error.txt");
  await fs.writeFile(
    errPath,
    input.error.endsWith("\n") || input.error === "" ? input.error : input.error + "\n",
    "utf8",
  );
  files.push(errPath);

  if (input.locatorSuggestion) {
    const p = path.join(artifactDir, "locator-suggestion.json");
    await fs.writeFile(p, JSON.stringify(input.locatorSuggestion, null, 2) + "\n", "utf8");
    files.push(p);
  }

  return { artifactDir, files };
}
