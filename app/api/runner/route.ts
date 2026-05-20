import { checkUncommittedChanges, createBranch, generateBranchName } from "@/lib/runner/git-utils";
import { spawnAgent } from "@/lib/runner/spawn-runner";
import { addExecutionLog, updateExecutionLog } from "@/lib/storage/execution-log-store";
import { getFeaturePlanById, updatePlanTaskStatus } from "@/lib/storage/feature-plan-store";

const SUPPORTED_RUNNER_AGENTS = new Set(["claude-code"]);

export async function POST(request: Request) {
  let responseStarted = false;
  const textEncoder = new TextEncoder();

  const encode = (log: string, type: "stdout" | "stderr" | "system") => {
    const json = JSON.stringify({ log, type });
    return textEncoder.encode(`data: ${json}\n\n`);
  };

  try {
    const body = await request.json() as {
      planId: string;
      taskId: string;
      prompt: string;
      cwd: string;
      agent: "claude-code" | "codex";
    };

    const { planId, taskId, prompt, cwd, agent } = body;

    if (!SUPPORTED_RUNNER_AGENTS.has(agent)) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: `[ERROR] ${agent} CLI execution is not supported yet. Use the copy-ready prompt for manual execution.`, type: "system" })}\n\n`),
        { status: 400, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    // planTask 조회
    const plan = await getFeaturePlanById(planId);
    if (!plan) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: `[ERROR] Plan not found: ${planId}`, type: "system" })}\n\n`),
        { status: 404, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const planTask = plan.tasks.find((t) => t.id === taskId);
    if (!planTask) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: `[ERROR] Task not found: ${taskId}`, type: "system" })}\n\n`),
        { status: 404, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    // SSE 스트림 생성
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          responseStarted = true;

          // 미커밋된 변경사항 확인
          const hasUncommitted = await checkUncommittedChanges(cwd);
          if (hasUncommitted) {
            controller.enqueue(encode(
              "[ERROR] Uncommitted changes detected. Commit, stash, or discard existing changes before running an agent so the analyzer can inspect only this execution.",
              "system",
            ));
            controller.close();
            return;
          }

          // 브랜치명 생성 및 생성
          const branchName = generateBranchName(taskId, planTask.title);
          controller.enqueue(encode(`[INFO] Creating branch: ${branchName}`, "system"));

          try {
            await createBranch(branchName, cwd);
            controller.enqueue(encode(`[INFO] Branch created: ${branchName}`, "system"));
          } catch (error) {
            controller.enqueue(encode(`[ERROR] Failed to create branch: ${error instanceof Error ? error.message : String(error)}`, "system"));
            controller.close();
            return;
          }

          // 태스크 상태를 running으로 업데이트
          try {
            await updatePlanTaskStatus(planId, taskId, "running");
          } catch (error) {
            controller.enqueue(encode(`[ERROR] Failed to update task status: ${error instanceof Error ? error.message : String(error)}`, "system"));
          }

          // ExecutionLog 생성
          const executionLog = await addExecutionLog({
            planTaskId: taskId,
            agent,
            branchName,
            startedAt: new Date().toISOString(),
            logLines: [],
            status: "running",
          });

          controller.enqueue(encode(`[INFO] Execution started. Log ID: ${executionLog.id}`, "system"));
          controller.enqueue(encode(`[INFO] Executing: ${agent} -p "..."`, "system"));
          controller.enqueue(encode("", "system")); // 빈 줄

          // spawnAgent 실행
          let logBuffer: string[] = [];

          await new Promise<void>((resolve, reject) => {
            spawnAgent({
              agent,
              prompt,
              cwd,
              onLog: (line: string) => {
                logBuffer.push(line);

                // stdout/stderr 타입 분류
                const type = line.startsWith("[stderr]") ? "stderr" : "stdout";
                const cleanedLine = line.startsWith("[stderr] ") ? line.slice("[stderr] ".length) : line;

                controller.enqueue(encode(cleanedLine, type));
              },
              onComplete: async (exitCode: number) => {
                try {
                  // ExecutionLog 상태: done 또는 failed (exitCode 기반)
                  const executionStatus = exitCode === 0 ? "done" : "failed";
                  // PlanTask 상태: done 또는 blocked (exitCode 기반)
                  const planTaskStatus = exitCode === 0 ? "done" : "blocked";

                  // ExecutionLog 업데이트
                  await updateExecutionLog(executionLog.id, {
                    completedAt: new Date().toISOString(),
                    exitCode,
                    logLines: logBuffer,
                    status: executionStatus,
                  });

                  // 태스크 상태 업데이트
                  try {
                    await updatePlanTaskStatus(planId, taskId, planTaskStatus);
                  } catch (error) {
                    controller.enqueue(encode(`[ERROR] Failed to update task status: ${error instanceof Error ? error.message : String(error)}`, "system"));
                  }

                  controller.enqueue(encode(`[DONE] Exit code: ${exitCode}`, "system"));
                  controller.close();
                  resolve();
                } catch (error) {
                  const msg = error instanceof Error ? error.message : String(error);
                  controller.enqueue(encode(`[ERROR] ${msg}`, "system"));
                  controller.close();
                  reject(error);
                }
              },
            }).catch((error) => {
              controller.enqueue(encode(`[ERROR] spawn failed: ${error instanceof Error ? error.message : String(error)}`, "system"));
              controller.close();
              reject(error);
            });
          });
        } catch (error) {
          if (!responseStarted) {
            controller.enqueue(encode(
              `[ERROR] ${error instanceof Error ? error.message : String(error)}`,
              "system"
            ));
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      textEncoder.encode(`data: ${JSON.stringify({ log: `[ERROR] ${error instanceof Error ? error.message : String(error)}`, type: "system" })}\n\n`),
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }
}
