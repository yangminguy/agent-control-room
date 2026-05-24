import { jest } from "@jest/globals";

// --- fs mock ---
const mockExistsSync = jest.fn() as jest.Mock<(p: unknown) => boolean>;
const mockReadFileAsync = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const mockWriteFileAsync = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const mockMkdirAsync = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const mockRenameAsync = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const mockCopyFileAsync = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>;

jest.mock("fs", () => ({
  existsSync: (path: unknown) => mockExistsSync(path),
  promises: {
    readFile: (path: unknown, opts?: unknown) => mockReadFileAsync(path, opts),
    writeFile: (path: unknown, data: unknown, opts?: unknown) => mockWriteFileAsync(path, data, opts),
    mkdir: (path: unknown, opts?: unknown) => mockMkdirAsync(path, opts),
    rename: (src: unknown, dest: unknown) => mockRenameAsync(src, dest),
    copyFile: (src: unknown, dest: unknown) => mockCopyFileAsync(src, dest),
  },
}));

// --- os mock ---
jest.mock("os", () => ({
  homedir: () => "/fake/home",
}));

import {
  detectAntigravityCurrentModel,
  getAntigravityModelSwitchCapability,
  checkAntigravityModelSwitchCapability,
  canSwitchAntigravityModelAutomatically,
  getAntigravityModelSwitchExplanation,
  attemptAntigravityModelSwitch,
  withAntigravityModel,
  isValidAntigravityModel,
  getValidAntigravityModels,
  recommendAntigravityModel,
  antigravityDisplayToModelId,
} from "@/lib/agents/antigravity-model-detection";

// Helper: make all existsSync calls return false by default
function noFiles() {
  mockExistsSync.mockReturnValue(false);
}

// Helper: simulate binary present, settings.json present
function bothExist() {
  mockExistsSync.mockReturnValue(true);
}

// Helper: simulate only settings.json present (no binary)
function onlySettings() {
  mockExistsSync.mockImplementation((p: unknown) => {
    const s = String(p);
    return s.endsWith("settings.json");
  });
}

// Helper: simulate only binary present (no settings)
function onlyBinary() {
  mockExistsSync.mockImplementation((p: unknown) => {
    const s = String(p);
    return s.endsWith("agy");
  });
}

describe("detectAntigravityCurrentModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
  });

  it("returns model string when settings.json has a model key", async () => {
    bothExist();
    mockReadFileAsync.mockResolvedValueOnce(
      JSON.stringify({ model: "Gemini 3.5 Flash (Medium)" })
    );

    const model = await detectAntigravityCurrentModel();

    expect(model).toBe("Gemini 3.5 Flash (Medium)");
  });

  it("returns undefined when settings.json exists but has no model key", async () => {
    bothExist();
    mockReadFileAsync.mockResolvedValueOnce(JSON.stringify({ colorScheme: "dark" }));

    const model = await detectAntigravityCurrentModel();

    expect(model).toBeUndefined();
  });

  it("returns undefined when settings.json is missing (read fails)", async () => {
    noFiles();
    mockReadFileAsync.mockRejectedValueOnce(new Error("ENOENT"));

    const model = await detectAntigravityCurrentModel();

    expect(model).toBeUndefined();
  });

  it("returns undefined when model value is not a string", async () => {
    bothExist();
    mockReadFileAsync.mockResolvedValueOnce(JSON.stringify({ model: 42 }));

    const model = await detectAntigravityCurrentModel();

    expect(model).toBeUndefined();
  });
});

describe("getAntigravityModelSwitchCapability (sync)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
  });

  it("returns canSwitch=false with specific failureReason when agy binary is absent", () => {
    noFiles();

    const cap = getAntigravityModelSwitchCapability();

    expect(cap.canSwitchAutomatically).toBe(false);
    expect(cap.failureReason).toContain("agy binary not found");
  });

  it("returns canSwitch=false with specific failureReason when settings.json is absent", () => {
    onlyBinary();

    const cap = getAntigravityModelSwitchCapability();

    expect(cap.canSwitchAutomatically).toBe(false);
    expect(cap.failureReason).toContain("settings.json does not exist");
  });

  it("returns canSwitch=true and switchMethod=config_write when both binary and settings exist", () => {
    bothExist();

    const cap = getAntigravityModelSwitchCapability();

    expect(cap.canSwitchAutomatically).toBe(true);
    expect(cap.canDetectCurrentModel).toBe(true);
    expect(cap.switchMethod).toBe("config_write");
  });

  it("populates binaryPath and settingsPath in all cases", () => {
    noFiles();

    const cap = getAntigravityModelSwitchCapability();

    expect(typeof cap.binaryPath).toBe("string");
    expect(typeof cap.settingsPath).toBe("string");
    expect(cap.settingsPath).toContain("settings.json");
  });

  it("includes a lastCheckedAt ISO timestamp", () => {
    noFiles();

    const cap = getAntigravityModelSwitchCapability();

    expect(() => new Date(cap.lastCheckedAt)).not.toThrow();
    expect(cap.lastCheckedAt).toMatch(/^\d{4}-/);
  });
});

describe("checkAntigravityModelSwitchCapability (async)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
  });

  it("populates currentModel when settings.json is readable and has model key", async () => {
    bothExist();
    mockReadFileAsync.mockResolvedValueOnce(
      JSON.stringify({ model: "Claude Sonnet 4.6 (Thinking)" })
    );

    const cap = await checkAntigravityModelSwitchCapability();

    expect(cap.currentModel).toBe("Claude Sonnet 4.6 (Thinking)");
  });

  it("returns canSwitch=false immediately when binary is absent (no read attempted)", async () => {
    noFiles();

    const cap = await checkAntigravityModelSwitchCapability();

    expect(cap.canSwitchAutomatically).toBe(false);
    expect(mockReadFileAsync).not.toHaveBeenCalled();
  });

  it("returns canSwitch=false with specific failureReason when settings.json parse fails", async () => {
    bothExist();
    mockReadFileAsync.mockRejectedValueOnce(new Error("permission denied"));

    const cap = await checkAntigravityModelSwitchCapability();

    expect(cap.canSwitchAutomatically).toBe(false);
    expect(cap.failureReason).toContain("settings.json parse error");
  });
});

describe("canSwitchAntigravityModelAutomatically", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
  });

  it("returns true when binary and settings both exist", () => {
    bothExist();
    expect(canSwitchAntigravityModelAutomatically()).toBe(true);
  });

  it("returns false when binary is absent", () => {
    noFiles();
    expect(canSwitchAntigravityModelAutomatically()).toBe(false);
  });
});

describe("getAntigravityModelSwitchExplanation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
  });

  it("returns config_write description when switching is possible", () => {
    bothExist();

    const explanation = getAntigravityModelSwitchExplanation();

    expect(explanation).toContain("config_write");
  });

  it("returns failureReason when switching is not possible", () => {
    noFiles();

    const explanation = getAntigravityModelSwitchExplanation();

    expect(explanation).toContain("agy binary not found");
  });
});

describe("attemptAntigravityModelSwitch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
    mockMkdirAsync.mockResolvedValue(undefined);
    mockWriteFileAsync.mockResolvedValue(undefined);
    mockRenameAsync.mockResolvedValue(undefined);
    mockCopyFileAsync.mockResolvedValue(undefined);
  });

  it("returns success=false with specific message when settings.json does not exist", async () => {
    mockReadFileAsync.mockRejectedValueOnce(new Error("ENOENT"));

    const result = await attemptAntigravityModelSwitch("Gemini 3.5 Flash (Medium)");

    expect(result.success).toBe(false);
    expect(result.message).toContain("settings.json does not exist");
  });

  it("creates a backup before writing the new model", async () => {
    mockReadFileAsync.mockResolvedValueOnce(
      JSON.stringify({ model: "old-model", colorScheme: "dark" })
    );
    // backup (copyFile) must succeed
    mockCopyFileAsync.mockResolvedValueOnce(undefined);

    await attemptAntigravityModelSwitch("Gemini 3.5 Flash (High)");

    expect(mockCopyFileAsync).toHaveBeenCalledTimes(1);
  });

  it("returns success=false with specific message when backup fails", async () => {
    mockReadFileAsync.mockResolvedValueOnce(
      JSON.stringify({ model: "old-model" })
    );
    mockCopyFileAsync.mockRejectedValueOnce(new Error("disk full"));

    const result = await attemptAntigravityModelSwitch("Gemini 3.5 Flash (High)");

    expect(result.success).toBe(false);
    expect(result.message).toContain("backup failed");
  });

  it("preserves non-model keys in the written settings", async () => {
    const original = { model: "old", colorScheme: "dark", trustedWorkspaces: ["/proj"] };
    mockReadFileAsync.mockResolvedValueOnce(JSON.stringify(original));
    mockCopyFileAsync.mockResolvedValueOnce(undefined);

    await attemptAntigravityModelSwitch("Gemini 3.1 Pro (High)");

    // writeFile is called with the serialized updated settings
    const writtenContent = mockWriteFileAsync.mock.calls[0][1] as string;
    const written = JSON.parse(writtenContent);

    expect(written.colorScheme).toBe("dark");
    expect(written.trustedWorkspaces).toEqual(["/proj"]);
    expect(written.model).toBe("Gemini 3.1 Pro (High)");
  });

  it("returns success=true with backupPath and previousModel on success", async () => {
    mockReadFileAsync.mockResolvedValueOnce(
      JSON.stringify({ model: "Gemini 3.5 Flash (Medium)" })
    );
    mockCopyFileAsync.mockResolvedValueOnce(undefined);

    const result = await attemptAntigravityModelSwitch("Gemini 3.1 Pro (High)");

    expect(result.success).toBe(true);
    expect(result.previousModel).toBe("Gemini 3.5 Flash (Medium)");
    expect(result.targetModel).toBe("Gemini 3.1 Pro (High)");
    expect(result.backupPath).toContain("backup-");
  });
});

describe("withAntigravityModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
    mockMkdirAsync.mockResolvedValue(undefined);
    mockWriteFileAsync.mockResolvedValue(undefined);
    mockRenameAsync.mockResolvedValue(undefined);
    mockCopyFileAsync.mockResolvedValue(undefined);
  });

  /**
   * Utility: set up mocks so that:
   * 1. First read  → returns previousModel in settings (for detectAntigravityCurrentModel)
   * 2. Second read → returns targetModel (for attemptAntigravityModelSwitch read inside)
   * 3. Third read  → returns previousModel (for restore read inside)
   *
   * copyFile succeeds for both backup attempts.
   */
  function setupMocksForWithModel(previousModel: string, targetModel: string) {
    // detectAntigravityCurrentModel → reads settings
    mockReadFileAsync.mockResolvedValueOnce(JSON.stringify({ model: previousModel }));
    // attemptAntigravityModelSwitch (switch to target) → reads settings
    mockReadFileAsync.mockResolvedValueOnce(JSON.stringify({ model: previousModel }));
    // backup for switch-to-target
    mockCopyFileAsync.mockResolvedValueOnce(undefined);
    // attemptAntigravityModelSwitch (restore to previous) → reads settings
    mockReadFileAsync.mockResolvedValueOnce(JSON.stringify({ model: targetModel }));
    // backup for restore
    mockCopyFileAsync.mockResolvedValueOnce(undefined);
  }

  it("returns the result of fn() on success", async () => {
    setupMocksForWithModel("Gemini 3.5 Flash (Medium)", "Gemini 3.1 Pro (High)");

    const result = await withAntigravityModel("Gemini 3.1 Pro (High)", async () => 42);

    expect(result).toBe(42);
  });

  it("restores previous model after fn() succeeds", async () => {
    setupMocksForWithModel("Gemini 3.5 Flash (Medium)", "Gemini 3.1 Pro (High)");

    await withAntigravityModel("Gemini 3.1 Pro (High)", async () => "done");

    // Two writeFile calls: one for switch, one for restore
    expect(mockWriteFileAsync).toHaveBeenCalledTimes(2);

    // The second write should contain the previous model value
    const secondWrite = mockWriteFileAsync.mock.calls[1][1] as string;
    const secondSettings = JSON.parse(secondWrite);
    expect(secondSettings.model).toBe("Gemini 3.5 Flash (Medium)");
  });

  it("restores previous model even when fn() throws", async () => {
    setupMocksForWithModel("Gemini 3.5 Flash (Medium)", "Gemini 3.1 Pro (High)");

    await expect(
      withAntigravityModel("Gemini 3.1 Pro (High)", async () => {
        throw new Error("fn failed");
      })
    ).rejects.toThrow("fn failed");

    // Restore write must still have been called
    expect(mockWriteFileAsync).toHaveBeenCalledTimes(2);
    const secondWrite = mockWriteFileAsync.mock.calls[1][1] as string;
    const secondSettings = JSON.parse(secondWrite);
    expect(secondSettings.model).toBe("Gemini 3.5 Flash (Medium)");
  });

  it("does not attempt restore when previousModel was undefined", async () => {
    // detectAntigravityCurrentModel returns undefined (missing model key)
    mockReadFileAsync.mockResolvedValueOnce(JSON.stringify({ colorScheme: "dark" }));
    // attemptAntigravityModelSwitch reads settings
    mockReadFileAsync.mockResolvedValueOnce(JSON.stringify({ colorScheme: "dark" }));
    mockCopyFileAsync.mockResolvedValueOnce(undefined);

    await withAntigravityModel("Gemini 3.1 Pro (High)", async () => "ok");

    // Only one write: the switch. No restore write.
    expect(mockWriteFileAsync).toHaveBeenCalledTimes(1);
  });
});

describe("isValidAntigravityModel", () => {
  it("returns true for known model names", () => {
    expect(isValidAntigravityModel("Gemini 3.5 Flash (Medium)")).toBe(true);
    expect(isValidAntigravityModel("Claude Sonnet 4.6 (Thinking)")).toBe(true);
    expect(isValidAntigravityModel("GPT-OSS 120B (Medium)")).toBe(true);
  });

  it("returns false for unknown model names", () => {
    expect(isValidAntigravityModel("gpt-4")).toBe(false);
    expect(isValidAntigravityModel("")).toBe(false);
    expect(isValidAntigravityModel("gemini-3.5-flash-medium")).toBe(false);
  });
});

describe("getValidAntigravityModels", () => {
  it("returns an array of strings", () => {
    const models = getValidAntigravityModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    models.forEach((m) => expect(typeof m).toBe("string"));
  });

  it("returns a copy — mutations do not affect future calls", () => {
    const first = getValidAntigravityModels();
    first.push("injected-model");
    const second = getValidAntigravityModels();
    expect(second).not.toContain("injected-model");
  });
});

describe("recommendAntigravityModel", () => {
  it("returns a fast model for light complexity", () => {
    const rec = recommendAntigravityModel("light");
    expect(rec.modelId).toContain("flash");
    expect(typeof rec.reason).toBe("string");
    expect(rec.reason.length).toBeGreaterThan(0);
  });

  it("returns a balanced model for medium complexity", () => {
    const rec = recommendAntigravityModel("medium");
    expect(rec.modelId).toContain("pro");
  });

  it("returns a high-capability model for complex tasks", () => {
    const rec = recommendAntigravityModel("complex");
    expect(rec.modelId).toContain("pro");
    expect(rec.modelId).toContain("high");
  });

  it("always returns modelId, displayName, and reason fields", () => {
    (["light", "medium", "complex"] as const).forEach((complexity) => {
      const rec = recommendAntigravityModel(complexity);
      expect(typeof rec.modelId).toBe("string");
      expect(typeof rec.displayName).toBe("string");
      expect(typeof rec.reason).toBe("string");
    });
  });
});

describe("antigravityDisplayToModelId", () => {
  it("converts a known display name to its model ID", () => {
    expect(antigravityDisplayToModelId("Gemini 3.5 Flash (Medium)")).toBe(
      "gemini-3.5-flash-medium"
    );
    expect(antigravityDisplayToModelId("Claude Sonnet 4.6 (Thinking)")).toBe(
      "claude-sonnet-4.6-thinking"
    );
  });

  it("returns undefined for an unknown display name", () => {
    expect(antigravityDisplayToModelId("unknown-model")).toBeUndefined();
  });
});
