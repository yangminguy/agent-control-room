/**
 * Project Context Manager
 * Analyzes a local project and extracts context for orchestration decisions
 */

import * as fs from "fs";
import * as path from "path";

export interface ProjectContext {
  projectId: string;
  projectPath: string;
  analyzedAt: string;
  techStack: string[];
  fileTree: string[];
  importantFiles: string[];
  riskyFiles: string[];
  packageScripts?: Record<string, string>;
  summary: string;
}

const IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".env",
  ".env.local",
];

/**
 * Analyze a project directory and extract context
 */
export function analyzeProjectPath(projectPath: string): ProjectContext {
  const projectId = `project-${Date.now()}`;
  const analyzedAt = new Date().toISOString();

  const techStack: string[] = [];
  const importantFiles: string[] = [];
  const riskyFiles: string[] = [];
  const fileTree: string[] = [];
  let packageScripts: Record<string, string> = {};

  try {
    // 1. Read package.json for tech stack
    const packageJsonPath = path.join(projectPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Extract known frameworks
        const frameworks: Record<string, string> = {
          next: "Next.js",
          react: "React",
          vue: "Vue",
          angular: "Angular",
          express: "Express",
          nestjs: "NestJS",
          fastapi: "FastAPI",
          django: "Django",
          flask: "Flask",
          supabase: "Supabase",
          typescript: "TypeScript",
          tailwindcss: "Tailwind CSS",
        };

        for (const [key, name] of Object.entries(frameworks)) {
          if (allDeps[key]) {
            techStack.push(name);
          }
        }

        // Store scripts
        if (pkg.scripts) {
          packageScripts = pkg.scripts;
        }

        importantFiles.push("package.json");
      } catch {
        // Ignore parse errors
      }
    }

    // 2. Scan directory for source files
    const sourceFiles = scanDirectory(projectPath, 0);
    fileTree.push(...sourceFiles.slice(0, 20));

    // 3. Identify risky files
    const riskKeywords = [
      "migration",
      "deploy",
      "secret",
      "auth",
      "database",
      "api/route",
      "middleware",
      "security",
    ];

    for (const file of sourceFiles) {
      const lowerFile = file.toLowerCase();
      if (riskKeywords.some((kw) => lowerFile.includes(kw))) {
        riskyFiles.push(file);
      }
    }

    // 4. Check for config files
    const configFiles = [
      "tsconfig.json",
      "next.config.js",
      "tailwind.config.js",
      ".github/workflows",
      "Dockerfile",
      "docker-compose.yml",
    ];

    for (const file of configFiles) {
      const filePath = path.join(projectPath, file);
      if (fs.existsSync(filePath)) {
        importantFiles.push(file);
      }
    }

    // 5. Generate summary
    const summary = generateSummary({
      projectPath,
      techStack,
      fileCount: sourceFiles.length,
      importantFiles: importantFiles.slice(0, 10),
      riskyFiles: riskyFiles.slice(0, 5),
    });

    return {
      projectId,
      projectPath,
      analyzedAt,
      techStack,
      fileTree,
      importantFiles: importantFiles.slice(0, 10),
      riskyFiles: riskyFiles.slice(0, 5),
      packageScripts,
      summary,
    };
  } catch (error) {
    console.error("[project-context-manager] 분석 실패:", error);
    return {
      projectId,
      projectPath,
      analyzedAt,
      techStack: [],
      fileTree: [],
      importantFiles: [],
      riskyFiles: [],
      packageScripts: {},
      summary: `프로젝트 분석 실패: ${String(error)}`,
    };
  }
}

/**
 * Convert ProjectContext to natural language string for LLM
 */
export function contextToPrompt(context: ProjectContext): string {
  const lines = [
    `## 프로젝트: ${path.basename(context.projectPath)}`,
    "",
    "### 기술 스택",
    context.techStack.length > 0 ? `- ${context.techStack.join(", ")}` : "- 정보 없음",
    "",
    "### 주요 파일",
    ...context.importantFiles.map((f) => `- ${f}`),
    "",
  ];

  if (context.riskyFiles.length > 0) {
    lines.push("### ⚠️ 위험도 높은 파일");
    lines.push(...context.riskyFiles.map((f) => `- ${f}`));
    lines.push("");
  }

  lines.push("### 요약");
  lines.push(context.summary);

  return lines.join("\n");
}

// ─── Helper Functions ───────────────────────────────────────────────────

function scanDirectory(dir: string, depth: number): string[] {
  if (depth > 3) return [];

  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      if (IGNORE_PATTERNS.includes(entry) || entry.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...scanDirectory(fullPath, depth + 1));
      } else if (stat.isFile()) {
        const ext = path.extname(entry);
        if ([".ts", ".tsx", ".js", ".jsx", ".sql", ".json"].includes(ext)) {
          files.push(fullPath.replace(dir, ""));
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return files;
}

function generateSummary(info: {
  projectPath: string;
  techStack: string[];
  fileCount: number;
  importantFiles: string[];
  riskyFiles: string[];
}): string {
  const parts = [];

  parts.push(`프로젝트 경로: ${info.projectPath}`);
  parts.push(`소스 파일: ${info.fileCount}개`);

  if (info.techStack.length > 0) {
    parts.push(`기술 스택: ${info.techStack.join(", ")}`);
  }

  if (info.riskyFiles.length > 0) {
    parts.push(`위험 파일 감지: ${info.riskyFiles.length}개 (마이그레이션, 배포, 보안 관련)`);
  }

  return parts.join("\n");
}
