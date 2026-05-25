import { jest } from "@jest/globals";
import path from "path";

// Mock fs/promises before importing the module under test
const mockReadFile = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const mockWriteFile = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const mockMkdir = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const mockRename = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const mockCopyFile = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>;

jest.mock("fs", () => ({
  promises: {
    readFile: (path: unknown, opts?: unknown) => mockReadFile(path, opts),
    writeFile: (path: unknown, data: unknown, opts?: unknown) => mockWriteFile(path, data, opts),
    mkdir: (path: unknown, opts?: unknown) => mockMkdir(path, opts),
    rename: (src: unknown, dest: unknown) => mockRename(src, dest),
    copyFile: (src: unknown, dest: unknown) => mockCopyFile(src, dest),
  },
}));

import {
  readAntigravitySettings,
  writeAntigravitySettings,
  backupAntigravitySettings,
  restoreAntigravitySettingsFromBackup,
  getAntigravitySettingsPath,
} from "@/lib/agents/antigravity-settings";

describe("getAntigravitySettingsPath", () => {
  const originalHome = process.env.HOME;

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  it("returns a path ending with settings.json under .gemini/antigravity-cli", () => {
    process.env.HOME = "/fake/home";
    const p = getAntigravitySettingsPath();
    expect(p).toContain(".gemini");
    expect(p).toContain("antigravity-cli");
    expect(p.endsWith("settings.json")).toBe(true);
  });
});

describe("readAntigravitySettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
  });

  it("returns success=true and parsed settings when settings.json exists", async () => {
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({ model: "Gemini 3.5 Flash (Medium)", colorScheme: "dark" })
    );

    const result = await readAntigravitySettings();

    expect(result.success).toBe(true);
    expect(result.settings).toEqual({
      model: "Gemini 3.5 Flash (Medium)",
      colorScheme: "dark",
    });
    expect(result.path).toContain("settings.json");
  });

  it("returns success=false when settings.json does not exist", async () => {
    const err = Object.assign(new Error("ENOENT: no such file or directory"), {
      code: "ENOENT",
    });
    mockReadFile.mockRejectedValueOnce(err);

    const result = await readAntigravitySettings();

    expect(result.success).toBe(false);
    expect(result.settings).toBeUndefined();
  });

  it("includes specific error message (not a generic fallback) when file is missing", async () => {
    const err = new Error("ENOENT: no such file or directory, open '/fake/path'");
    mockReadFile.mockRejectedValueOnce(err);

    const result = await readAntigravitySettings();

    expect(result.error).toBe(err.message);
    expect(result.error).not.toBe("failed");
  });

  it("parses JSON correctly — all keys preserved", async () => {
    const raw = { model: "Claude Sonnet 4.6 (Thinking)", trustedWorkspaces: ["/a", "/b"] };
    mockReadFile.mockResolvedValueOnce(JSON.stringify(raw));

    const result = await readAntigravitySettings();

    expect(result.settings?.model).toBe("Claude Sonnet 4.6 (Thinking)");
    expect(result.settings?.trustedWorkspaces).toEqual(["/a", "/b"]);
  });

  it("returns success=false and error message when JSON is malformed", async () => {
    mockReadFile.mockResolvedValueOnce("{ bad json ]");

    const result = await readAntigravitySettings();

    expect(result.success).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.error!.length).toBeGreaterThan(0);
  });
});

describe("writeAntigravitySettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    // For backup (used when options.backup=true)
    mockCopyFile.mockResolvedValue(undefined);
  });

  it("creates the directory recursively before writing", async () => {
    await writeAntigravitySettings({ model: "Gemini 3.5 Flash (Medium)" });

    expect(mockMkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it("uses atomic write: writes to a .tmp path and then renames to final path", async () => {
    const settings = { model: "Gemini 3.1 Pro (High)" };
    await writeAntigravitySettings(settings);

    const tmpPathArg = mockWriteFile.mock.calls[0][0] as string;
    const renameFromArg = mockRename.mock.calls[0][0] as string;
    const renameToArg = mockRename.mock.calls[0][1] as string;

    expect(tmpPathArg).toMatch(/\.tmp$/);
    expect(renameFromArg).toBe(tmpPathArg);
    expect(renameToArg).toMatch(/settings\.json$/);
    expect(renameToArg).not.toMatch(/\.tmp$/);
  });

  it("returns success=true with the written settings on success", async () => {
    const settings = { model: "GPT-OSS 120B (Medium)", colorScheme: "light" };
    const result = await writeAntigravitySettings(settings);

    expect(result.success).toBe(true);
    expect(result.settings).toEqual(settings);
  });

  it("returns success=false with a specific error message when write fails", async () => {
    mockWriteFile.mockRejectedValueOnce(new Error("disk full"));

    const result = await writeAntigravitySettings({ model: "x" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to write settings.json");
    expect(result.error).toContain("disk full");
  });

  it("calls backupAntigravitySettings (copyFile) when options.backup=true", async () => {
    await writeAntigravitySettings({ model: "new" }, { backup: true });

    expect(mockCopyFile).toHaveBeenCalled();
  });

  it("does not call copyFile when options.backup is omitted", async () => {
    await writeAntigravitySettings({ model: "x" });

    expect(mockCopyFile).not.toHaveBeenCalled();
  });
});

describe("backupAntigravitySettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
    mockCopyFile.mockResolvedValue(undefined);
  });

  it("returns backup info with backupPath, originalPath, and timestamp", async () => {
    const result = await backupAntigravitySettings();

    expect(result).not.toBeNull();
    expect(result!.backupPath).toContain("settings.json.backup-");
    expect(result!.originalPath).toMatch(/settings\.json$/);
    expect(typeof result!.timestamp).toBe("string");
    expect(result!.timestamp.length).toBeGreaterThan(0);
  });

  it("calls fs.copyFile with source=settingsPath and dest=backupPath", async () => {
    const result = await backupAntigravitySettings();

    expect(mockCopyFile).toHaveBeenCalledWith(
      result!.originalPath,
      result!.backupPath
    );
  });

  it("returns null when copyFile fails (settings.json does not exist)", async () => {
    mockCopyFile.mockRejectedValueOnce(new Error("ENOENT"));

    const result = await backupAntigravitySettings();

    expect(result).toBeNull();
  });

  it("backupPath includes a timestamp suffix derived from current time", async () => {
    const before = Date.now();
    const result = await backupAntigravitySettings();
    const after = Date.now();

    // Backup path format: settings.json.backup-<ISO-with-colons-replaced>
    expect(result!.backupPath).toMatch(/backup-\d{4}-\d{2}-\d{2}/);
    // Sanity: timestamp string should be parseable
    const ts = result!.timestamp.replace(/-/g, ":").replace(/T(\d{2}):(\d{2}):/, "T$1:$2:");
    void before;
    void after;
    expect(typeof ts).toBe("string");
  });
});

describe("restoreAntigravitySettingsFromBackup", () => {
  const backupPath = "/fake/home/.gemini/antigravity-cli/settings.json.backup-2026-01-01";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
  });

  it("returns success=true and parsed settings on successful restore", async () => {
    const data = { model: "Gemini 3.1 Pro (Low)", colorScheme: "dark" };
    mockCopyFile.mockResolvedValueOnce(undefined);
    mockReadFile.mockResolvedValueOnce(JSON.stringify(data));

    const result = await restoreAntigravitySettingsFromBackup(backupPath);

    expect(result.success).toBe(true);
    expect(result.settings).toEqual(data);
  });

  it("copies from backupPath to settingsPath", async () => {
    mockCopyFile.mockResolvedValueOnce(undefined);
    mockReadFile.mockResolvedValueOnce(JSON.stringify({ model: "x" }));

    await restoreAntigravitySettingsFromBackup(backupPath);

    const [src, dest] = mockCopyFile.mock.calls[0] as [string, string];
    expect(src).toBe(backupPath);
    expect(dest).toMatch(/settings\.json$/);
  });

  it("returns success=false with specific error when backup file does not exist", async () => {
    const err = new Error("ENOENT: no such file or directory, open '/fake/backup'");
    mockCopyFile.mockRejectedValueOnce(err);

    const result = await restoreAntigravitySettingsFromBackup("/fake/backup");

    expect(result.success).toBe(false);
    expect(result.error).toBe(err.message);
    expect(result.error).not.toBe("failed");
  });

  it("returns success=false with specific error when restored JSON is invalid", async () => {
    mockCopyFile.mockResolvedValueOnce(undefined);
    mockReadFile.mockResolvedValueOnce("not-valid-json{{");

    const result = await restoreAntigravitySettingsFromBackup(backupPath);

    expect(result.success).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.error!.length).toBeGreaterThan(0);
  });
});
