import fs from "fs";
import path from "path";

const root = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

describe("chat-first Control Room", () => {
  it("keeps planning endpoints free of agent execution", () => {
    const chatRoute = read("app/api/control-room/chat/route.ts");
    const finalizeRoute = read("app/api/control-room/finalize-plan/route.ts");
    const planningSurface = `${chatRoute}\n${finalizeRoute}`;

    expect(planningSurface).toContain("planningOnly");
    expect(planningSurface).not.toContain("spawnAgent");
    expect(planningSurface).not.toContain("executeControlRoomPlan");
    expect(planningSurface).not.toContain("createBranch");
  });

  it("requires the explicit execute endpoint before execution starts", () => {
    const executeRoute = read("app/api/control-room/execute-plan/route.ts");
    const homeUi = read("components/control-room/ChatControlRoom.tsx");
    const execution = read("lib/control-room/execution.ts");

    expect(executeRoute).toContain("I approve starting this finalized plan");
    expect(executeRoute).toContain("executeControlRoomPlan");
    expect(execution).not.toContain("/api/orchestration/dispatch");
    expect(execution).not.toContain("getAdapter");
    expect(homeUi).toContain("실제 실행 시작");
    expect(homeUi).toContain("canExecute");
  });

  it("uses OpenAI structured output for chat planning", () => {
    const orchestrator = read("lib/control-room/orchestrator.ts");

    expect(orchestrator).toContain("openai.responses.create");
    expect(orchestrator).toContain('model: "gpt-5-mini"');
    expect(orchestrator).toContain("json_schema");
    expect(orchestrator).toContain("finalPlanReady");
  });
});
