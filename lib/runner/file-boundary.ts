import { execSync } from "child_process";

export type FileBoundaryConfig = {
  allowedFiles?: string[];
  doNotTouchFiles?: string[];
};

export type FileBoundaryCheck = {
  changedFiles: string[];
  forbiddenFiles: string[];
  allowedFiles: string[];
  doNotTouchFiles: string[];
  hasViolation: boolean;
  reason: string;
  nextAction: string;
};

const DEFAULT_REASON =
  "The runner changed files outside the approved task boundary. Agent Control Room must stop because this is not a clean success and the user must review scope drift.";

const DEFAULT_NEXT_ACTION =
  "Review the listed files, decide whether the changes are acceptable, then ask an agent to fix or revert them manually if needed.";

export function collectChangedFiles(cwd: string): string[] {
  const output = execSync("git status --porcelain", {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const renamed = line.match(/^R\s+(.+?)\s+->\s+(.+)$/);
      if (renamed) return [renamed[1], renamed[2]];
      return [line.slice(3).trim()];
    })
    .filter((file, index, all) => file.length > 0 && all.indexOf(file) === index)
    .sort();
}

/**
 * Count how many *pre-existing* tracked files were modified (not newly created),
 * from `git status --porcelain`. Used by the L5 verifier to detect the "orphaned
 * deliverable" failure mode of an integrate phase: new files added but no
 * existing entry point touched, i.e. the work was never wired in.
 *
 * porcelain status (first two chars `XY`): `??` = untracked (new), `A` in the
 * index column = staged addition (new). Anything else (M/D/R/C, staged or not)
 * touches a file that already existed in the tree → counts as modified-existing.
 * Must be read at the same point as collectChangedFiles (before the phase commit),
 * since after the commit the working tree is clean and porcelain is empty.
 */
export function countModifiedExistingFiles(cwd: string): number {
  const output = execSync("git status --porcelain", {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  return output
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .filter((line) => {
      if (line.startsWith("??")) return false; // untracked = new file
      if (line[0] === "A") return false; // staged addition = new file
      return true; // M/D/R/C → a pre-existing file was touched
    }).length;
}

export function extractFileBoundariesFromPrompt(prompt: string): FileBoundaryConfig {
  return {
    allowedFiles: extractMarkdownListSection(prompt, [
      "Allowed Files to Edit",
      "Allowed Files",
      "Files Allowed to Edit",
    ]),
    doNotTouchFiles: extractMarkdownListSection(prompt, [
      "Do Not Touch",
      "Do-Not-Touch Files",
      "Files Not to Modify",
      "Do Not Edit",
    ]),
  };
}

export function checkFileBoundaries(
  changedFiles: string[],
  config: FileBoundaryConfig,
): FileBoundaryCheck {
  const allowedFiles = normalizePatterns(config.allowedFiles ?? []);
  const doNotTouchFiles = normalizePatterns(config.doNotTouchFiles ?? []);

  const forbiddenByDoNotTouch = changedFiles.filter((file) =>
    doNotTouchFiles.some((pattern) => matchesBoundaryPattern(file, pattern)),
  );

  const forbiddenByAllowedList =
    allowedFiles.length > 0
      ? changedFiles.filter((file) =>
          !allowedFiles.some((pattern) => matchesBoundaryPattern(file, pattern)),
        )
      : [];

  const forbiddenFiles = [...forbiddenByDoNotTouch, ...forbiddenByAllowedList]
    .filter((file, index, all) => all.indexOf(file) === index)
    .sort();

  return {
    changedFiles,
    forbiddenFiles,
    allowedFiles,
    doNotTouchFiles,
    hasViolation: forbiddenFiles.length > 0,
    reason: forbiddenFiles.length > 0 ? DEFAULT_REASON : "No file boundary violations detected.",
    nextAction: forbiddenFiles.length > 0 ? DEFAULT_NEXT_ACTION : "Continue normal result review.",
  };
}

function extractMarkdownListSection(markdown: string, sectionNames: string[]): string[] {
  const lines = markdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => {
    const heading = line.match(/^#{2,6}\s+(.+?)\s*$/);
    return Boolean(
      heading &&
        sectionNames.some(
          (name) => heading[1].trim().toLowerCase() === name.toLowerCase(),
        ),
    );
  });

  if (startIndex === -1) return [];

  const values: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^#{2,6}\s+/.test(line)) break;
    const item = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (item) values.push(cleanBoundaryValue(item[1]));
  }

  return normalizePatterns(values);
}

function normalizePatterns(patterns: string[]): string[] {
  return patterns
    .map(cleanBoundaryValue)
    .filter((pattern) => pattern.length > 0)
    .filter((pattern) => !/^(none|n\/a|not specified)$/i.test(pattern))
    .filter((pattern) => !/^files directly relevant/i.test(pattern))
    .filter((pattern, index, all) => all.indexOf(pattern) === index);
}

function cleanBoundaryValue(value: string): string {
  return value
    .replace(/`/g, "")
    .replace(/\s+#.*$/, "")
    .trim();
}

function matchesBoundaryPattern(file: string, pattern: string): boolean {
  if (pattern.endsWith("/**")) {
    return file.startsWith(pattern.slice(0, -3));
  }
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1);
    return file.startsWith(prefix) && !file.slice(prefix.length).includes("/");
  }
  if (pattern.includes("*")) {
    const escaped = pattern
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${escaped}$`).test(file);
  }
  return file === pattern || file.startsWith(`${pattern}/`);
}
