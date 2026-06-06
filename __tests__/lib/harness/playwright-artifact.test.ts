/**
 * Tests for lib/harness/playwright-artifact.ts (PRD §14.1 / §14.2).
 *
 * generateLocatorSuggestion is pure — tested without I/O. savePlaywrightArtifacts
 * writes under a unique os.tmpdir() dir injected per test and cleaned up after.
 */

import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  generateLocatorSuggestion,
  savePlaywrightArtifacts,
} from "@/lib/harness/playwright-artifact";

describe("generateLocatorSuggestion — purity & policy (§14.2)", () => {
  it("never allows auto patch", () => {
    const s = generateLocatorSuggestion("page.locator('.x')");
    expect(s.auto_patch_allowed).toBe(false);
  });

  it("prefers role + accessible name (matches PRD example)", () => {
    const s = generateLocatorSuggestion("page.locator('.submit-btn')", {
      role: "button",
      accessibleName: "저장",
    });
    expect(s.strategy).toBe("role");
    expect(s.suggested_locator).toBe(
      "page.getByRole('button', { name: '저장' })",
    );
    expect(s.confidence).toBeGreaterThanOrEqual(0.85);
    expect(s.broken_locator).toBe("page.locator('.submit-btn')");
    expect(s.auto_patch_allowed).toBe(false);
  });

  it("falls back to label, testid, text, role in priority order", () => {
    expect(
      generateLocatorSuggestion("x", { accessibleName: "Email" }).strategy,
    ).toBe("label");
    expect(generateLocatorSuggestion("x", { testId: "submit" }).strategy).toBe(
      "testid",
    );
    expect(generateLocatorSuggestion("x", { text: "Save" }).strategy).toBe(
      "text",
    );
    expect(generateLocatorSuggestion("x", { role: "button" }).strategy).toBe(
      "role",
    );
  });

  it("returns a well-formed low-confidence css suggestion with no context", () => {
    const broken = "page.locator('.lonely')";
    const s = generateLocatorSuggestion(broken);
    expect(s.strategy).toBe("css");
    expect(s.suggested_locator).toBe(broken);
    expect(s.confidence).toBeLessThan(0.5);
  });

  it("escapes single quotes in names", () => {
    const s = generateLocatorSuggestion("x", {
      role: "button",
      accessibleName: "It's me",
    });
    expect(s.suggested_locator).toBe(
      "page.getByRole('button', { name: 'It\\'s me' })",
    );
  });

  it("is a pure function (no mutation of input context)", () => {
    const ctx = { role: "button", accessibleName: "Go" };
    const frozen = Object.freeze({ ...ctx });
    expect(() => generateLocatorSuggestion("x", frozen)).not.toThrow();
  });
});

describe("savePlaywrightArtifacts — persistence (§14.1)", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "acr-pw-"));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("writes all artifacts under artifacts/runs/{runId}/", async () => {
    const suggestion = generateLocatorSuggestion("page.locator('.x')", {
      role: "button",
      accessibleName: "저장",
    });
    const res = await savePlaywrightArtifacts({
      runId: "run_20260606_001",
      dir,
      screenshot: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      dom: "<html><body>broken</body></html>",
      error: "TimeoutError: locator not found",
      locatorSuggestion: suggestion,
    });

    const expectedDir = path.join(
      dir,
      "artifacts",
      "runs",
      "run_20260606_001",
    );
    expect(res.artifactDir).toBe(expectedDir);

    const onDisk = (await fs.readdir(expectedDir)).sort();
    expect(onDisk).toEqual(
      [
        "dom-snapshot.html",
        "locator-suggestion.json",
        "playwright-error.txt",
        "screenshot.png",
      ].sort(),
    );

    const json = JSON.parse(
      await fs.readFile(
        path.join(expectedDir, "locator-suggestion.json"),
        "utf8",
      ),
    );
    expect(json.auto_patch_allowed).toBe(false);
    expect(json.suggested_locator).toContain("getByRole");
  });

  it("only writes provided inputs; error file is always present", async () => {
    const res = await savePlaywrightArtifacts({
      runId: "run_x",
      dir,
      error: "boom",
    });
    expect(res.files).toHaveLength(1);
    const onDisk = await fs.readdir(
      path.join(dir, "artifacts", "runs", "run_x"),
    );
    expect(onDisk).toEqual(["playwright-error.txt"]);
    const err = await fs.readFile(res.files[0], "utf8");
    expect(err.trim()).toBe("boom");
  });

  it("returns absolute paths that exist on disk", async () => {
    const res = await savePlaywrightArtifacts({
      runId: "run_y",
      dir,
      dom: "<html></html>",
      error: "e",
    });
    for (const f of res.files) {
      expect(path.isAbsolute(f)).toBe(true);
      await expect(fs.access(f)).resolves.toBeUndefined();
    }
  });
});
