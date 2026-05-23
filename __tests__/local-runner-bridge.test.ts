import fs from "fs";
import path from "path";

const root = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

describe("local runner bridge", () => {
  it("queues Control Room execution for a local runner instead of Vercel-side agent dispatch", () => {
    const execution = read("lib/control-room/execution.ts");

    expect(execution).toContain('executionSurface: "local_runner"');
    expect(execution).toContain("local runner/workbench bridge");
    expect(execution).not.toContain("/api/orchestration/dispatch");
    expect(execution).not.toContain("getAdapter");
  });

  it("exposes claim and result endpoints for an external local daemon", () => {
    const jobsRoute = read("app/api/local-runner/jobs/route.ts");
    const resultsRoute = read("app/api/local-runner/results/route.ts");

    expect(jobsRoute).toContain("claimJobsForLocalRunner");
    expect(jobsRoute).toContain("runnerId");
    expect(resultsRoute).toContain("acceptLocalRunnerResult");
    expect(resultsRoute).toContain("resultStatus");
  });

  it("keeps the daemon outside the deployed Vercel process", () => {
    const daemon = read("scripts/local-runner-daemon.mjs");

    expect(daemon).toContain("CONTROL_ROOM_URL");
    expect(daemon).toContain("/api/local-runner/jobs");
    expect(daemon).toContain("/api/local-runner/results");
    expect(daemon).toContain('command: "claude"');
    expect(daemon).toContain('command: "codex"');
  });
});
