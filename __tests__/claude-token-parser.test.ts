import { parseClaudeStreamEvent } from "@/lib/runner/claude-token-parser";

describe("parseClaudeStreamEvent", () => {
  it("passes non-JSON lines through as raw log text", () => {
    const r = parseClaudeStreamEvent("just some plain text");
    expect(r.logText).toBe("just some plain text");
    expect(r.tokens).toBeUndefined();
  });

  it("ignores blank lines", () => {
    expect(parseClaudeStreamEvent("   ")).toEqual({});
  });

  it("extracts text and tool_use from an assistant event", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "수정했습니다" },
          { type: "tool_use", name: "Edit", input: {} },
        ],
      },
    });
    const r = parseClaudeStreamEvent(line);
    expect(r.logText).toContain("수정했습니다");
    expect(r.logText).toContain("[tool] Edit");
    expect(r.tokens).toBeUndefined();
  });

  it("captures usage + cost from the result event (incl. cache tokens)", () => {
    const line = JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      total_cost_usd: 0.0234,
      usage: {
        input_tokens: 100,
        output_tokens: 200,
        cache_creation_input_tokens: 50,
        cache_read_input_tokens: 1000,
      },
    });
    const r = parseClaudeStreamEvent(line);
    expect(r.tokens).toBeDefined();
    expect(r.tokens!.input_tokens).toBe(100);
    expect(r.tokens!.output_tokens).toBe(200);
    expect(r.tokens!.total_tokens).toBe(1350); // 100+200+50+1000
    expect(r.tokens!.estimated_cost_usd).toBe(0.0234);
    expect(r.logText).toContain("1350 tokens");
  });

  it("handles a result event without cost", () => {
    const line = JSON.stringify({
      type: "result",
      usage: { input_tokens: 10, output_tokens: 20 },
    });
    const r = parseClaudeStreamEvent(line);
    expect(r.tokens!.total_tokens).toBe(30);
    expect(r.tokens!.estimated_cost_usd).toBeNull();
  });

  it("stays silent on system/user events", () => {
    expect(parseClaudeStreamEvent(JSON.stringify({ type: "system", subtype: "init" }))).toEqual({});
    expect(parseClaudeStreamEvent(JSON.stringify({ type: "user", message: {} }))).toEqual({});
  });
});
