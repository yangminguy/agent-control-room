#!/usr/bin/env node
/**
 * Analyze and Auto-Patch CLI Tool
 * 프로젝트를 분석하고 OpenAI가 제안한 변경사항을 자동으로 파일에 적용합니다.
 *
 * Usage:
 *   npx ts-node scripts/analyze-and-patch.ts . "add hover effect to button"
 *   npx ts-node scripts/analyze-and-patch.ts /path/to/project "버튼 색상 변경"
 */

import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import * as readline from "readline";

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

interface FilePatch {
  path: string;
  original: string;
  modified: string;
  reason: string;
}

interface PatchPlan {
  summary: string;
  patches: FilePatch[];
  explanation: string;
}

function scanProjectFiles(projectPath: string, depth = 0): string[] {
  if (depth > 3) return [];

  const files: string[] = [];

  try {
    const entries = fs.readdirSync(projectPath);

    for (const entry of entries) {
      if (IGNORE_PATTERNS.includes(entry) || entry.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(projectPath, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...scanProjectFiles(fullPath, depth + 1));
      } else if (stat.isFile()) {
        const ext = path.extname(entry);
        if ([".ts", ".tsx", ".js", ".jsx", ".css", ".html"].includes(ext)) {
          const size = stat.size;
          // Only include reasonably-sized files (< 100KB)
          if (size < 100 * 1024) {
            files.push(fullPath);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[scan] 에러: ${String(error)}`);
  }

  return files;
}

function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function writeFile(filePath: string, content: string): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  } catch (error) {
    console.error(`[write] 실패: ${String(error)}`);
    return false;
  }
}

async function askYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function getPatchPlanFromAI(
  projectPath: string,
  instruction: string,
  files: string[]
): Promise<PatchPlan> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  // Read a subset of relevant files (max 10 files, max 5KB each)
  const fileContents: Record<string, string> = {};
  const sortedFiles = files.sort(() => Math.random() - 0.5).slice(0, 10);

  for (const file of sortedFiles) {
    const content = readFile(file);
    if (content && content.length < 5000) {
      const relativePath = path.relative(projectPath, file);
      fileContents[relativePath] = content;
    }
  }

  const systemPrompt = `You are an AI code modification assistant.
Your job is to:
1. Understand the user's instruction
2. Identify which files need to be modified
3. Generate exact patches with before/after content
4. Return a JSON patch plan

You MUST respond with a valid JSON object (no markdown, no code blocks).
Format:
{
  "summary": "brief description of changes",
  "patches": [
    {
      "path": "relative/path/to/file.tsx",
      "original": "exact original code block",
      "modified": "exact modified code block",
      "reason": "why this change was made"
    }
  ],
  "explanation": "overall explanation of the patch plan"
}`;

  const userPrompt = `Project structure: ${Object.keys(fileContents).join(", ")}

${Object.entries(fileContents)
  .map(([path, content]) => `File: ${path}\n\`\`\`\n${content}\n\`\`\``)
  .join("\n\n")}

Instruction: ${instruction}

Generate a patch plan in JSON format. Keep changes minimal and focused.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || "";

  // Parse JSON response (handle markdown code blocks)
  let jsonStr = content;
  if (content.includes("```json")) {
    jsonStr = content.split("```json")[1].split("```")[0];
  } else if (content.includes("```")) {
    jsonStr = content.split("```")[1].split("```")[0];
  }

  const plan = JSON.parse(jsonStr.trim()) as PatchPlan;
  return plan;
}

function applyPatches(projectPath: string, patches: FilePatch[]): number {
  let successCount = 0;

  for (const patch of patches) {
    const filePath = path.join(projectPath, patch.path);
    const current = readFile(filePath);

    if (!current) {
      console.warn(`⚠️  파일을 읽을 수 없음: ${patch.path}`);
      continue;
    }

    if (!current.includes(patch.original)) {
      console.warn(`⚠️  원본 코드를 찾을 수 없음: ${patch.path}`);
      console.warn(`    찾고 있던 코드:\n${patch.original.slice(0, 100)}...`);
      continue;
    }

    const modified = current.replace(patch.original, patch.modified);

    if (writeFile(filePath, modified)) {
      console.log(`✅ ${patch.path}`);
      successCount++;
    } else {
      console.warn(`❌ 쓰기 실패: ${patch.path}`);
    }
  }

  return successCount;
}

async function main() {
  const projectPath = process.argv[2] || ".";
  const instruction = process.argv.slice(3).join(" ");

  if (!instruction) {
    console.error("사용법: npx ts-node scripts/analyze-and-patch.ts <path> <instruction>");
    console.error("예: npx ts-node scripts/analyze-and-patch.ts . \"add hover effect\"");
    process.exit(1);
  }

  console.log(`\n🔍 프로젝트 분석 중... (${projectPath})`);
  const files = scanProjectFiles(projectPath);
  console.log(`   ${files.length}개 파일 발견`);

  console.log(`\n📋 AI가 수정 계획 생성 중...`);
  let plan: PatchPlan;
  try {
    plan = await getPatchPlanFromAI(projectPath, instruction, files);
  } catch (error) {
    console.error(`❌ AI 응답 실패: ${String(error)}`);
    process.exit(1);
  }

  console.log(`\n📝 수정 계획:`);
  console.log(`   ${plan.summary}`);
  console.log(`\n변경 파일:`);
  for (const patch of plan.patches) {
    console.log(`   - ${patch.path}: ${patch.reason}`);
  }

  console.log(`\n📖 설명:`);
  console.log(`   ${plan.explanation}`);

  const confirmed = await askYesNo(`\n변경사항을 적용할까요?`);
  if (!confirmed) {
    console.log("취소되었습니다.");
    process.exit(0);
  }

  console.log(`\n⚙️  변경사항 적용 중...`);
  const successCount = applyPatches(projectPath, plan.patches);

  console.log(`\n✅ ${successCount}/${plan.patches.length} 파일 수정 완료`);

  console.log(`\n📊 변경 사항 확인:`);
  console.log(`   git diff`);
}

main().catch((error) => {
  console.error(`❌ 에러: ${String(error)}`);
  process.exit(1);
});
