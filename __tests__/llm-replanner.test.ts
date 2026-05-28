import { replanNextPrompt, type ReplanLLM } from "@/lib/orchestration/llm-replanner";

describe("replanNextPrompt", () => {
  const baseInput = {
    userGoal: "Build feature X",
    nextPhaseTitle: "Phase 2: Implementation",
    basePrompt: "Implement the API endpoint.",
    priorContext: "[PRIOR PHASE CONTEXT]\nPhase: Spec\nDiff stat: 1 file changed",
  };

  it("returns deterministic concat when no LLM is supplied", async () => {
    const out = await replanNextPrompt(baseInput, null);
    expect(out).toContain("[PRIOR PHASE CONTEXT]");
    expect(out).toContain("Implement the API endpoint.");
  });

  it("returns basePrompt only when priorContext is empty and no LLM", async () => {
    const out = await replanNextPrompt({ ...baseInput, priorContext: "" }, null);
    expect(out).toBe("Implement the API endpoint.");
  });

  it("uses LLM output when available", async () => {
    const llm = jest.fn<ReturnType<ReplanLLM>, Parameters<ReplanLLM>>(
      async () => "REWRITTEN: skip step 1, do step 2.",
    );
    const out = await replanNextPrompt(baseInput, llm);
    expect(out).toBe("REWRITTEN: skip step 1, do step 2.");
    expect(llm).toHaveBeenCalledTimes(1);
    const arg = llm.mock.calls[0]![0];
    expect(arg.system).toContain("rewrite the next-phase prompt");
    expect(arg.user).toContain("userGoal: Build feature X");
    expect(arg.user).toContain("priorContext:");
  });

  it("falls back to deterministic when LLM throws", async () => {
    const llm = jest.fn<ReturnType<ReplanLLM>, Parameters<ReplanLLM>>(async () => {
      throw new Error("rate limited");
    });
    const out = await replanNextPrompt(baseInput, llm);
    expect(out).toContain("[PRIOR PHASE CONTEXT]");
    expect(out).toContain("Implement the API endpoint.");
  });

  it("falls back when LLM returns suspiciously short output", async () => {
    const llm = jest.fn<ReturnType<ReplanLLM>, Parameters<ReplanLLM>>(async () => "ok");
    const out = await replanNextPrompt(baseInput, llm);
    expect(out).toContain("Implement the API endpoint.");
    expect(out).not.toBe("ok");
  });
});
