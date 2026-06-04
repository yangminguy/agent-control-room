// Phase 6 — parse `claude -p --output-format stream-json --verbose` events.
//
// stream-json emits one JSON object per line: a system init, assistant message
// events (with text / tool_use content), user (tool result) events, and a final
// `result` event carrying token usage + total_cost_usd. This lets us keep the
// live log stream (we emit the human-readable text) AND capture measured tokens
// (from the result event) without losing either. Used only when
// ACR_CAPTURE_TOKENS=1; plain `claude -p` is unchanged otherwise.

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  /** input + output + cache creation + cache read (all real usage). */
  total_tokens: number;
  estimated_cost_usd: number | null;
}

export interface ParsedStreamEvent {
  /** Human-readable text to forward to the live log (omitted for silent events). */
  logText?: string;
  /** Present only on the final `result` event. */
  tokens?: TokenUsage;
}

function sumUsage(u: Record<string, unknown> | undefined): number {
  if (!u) return 0;
  const n = (k: string) => (typeof u[k] === 'number' ? (u[k] as number) : 0);
  return n('input_tokens') + n('output_tokens') + n('cache_creation_input_tokens') + n('cache_read_input_tokens');
}

/**
 * Parse one stream-json line. Returns the log text to display and, on the final
 * result event, the measured token usage. Any non-JSON line is passed through
 * verbatim as log text so the runner never drops output (defensive fallback).
 */
export function parseClaudeStreamEvent(line: string): ParsedStreamEvent {
  const trimmed = line.trim();
  if (!trimmed) return {};

  let obj: any;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return { logText: line }; // not JSON → raw passthrough
  }
  if (!obj || typeof obj !== 'object') return { logText: line };

  switch (obj.type) {
    case 'assistant': {
      const content = obj.message?.content;
      if (!Array.isArray(content)) return {};
      const parts: string[] = [];
      for (const block of content) {
        if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
          parts.push(block.text.trim());
        } else if (block?.type === 'tool_use' && typeof block.name === 'string') {
          parts.push(`[tool] ${block.name}`);
        }
      }
      return parts.length ? { logText: parts.join('\n') } : {};
    }
    case 'result': {
      const u = obj.usage as Record<string, unknown> | undefined;
      const input = typeof u?.input_tokens === 'number' ? (u!.input_tokens as number) : 0;
      const output = typeof u?.output_tokens === 'number' ? (u!.output_tokens as number) : 0;
      const tokens: TokenUsage = {
        input_tokens: input,
        output_tokens: output,
        total_tokens: sumUsage(u),
        estimated_cost_usd:
          typeof obj.total_cost_usd === 'number' ? obj.total_cost_usd : null,
      };
      const summary =
        obj.is_error ? `[result] error` : `[result] ${tokens.total_tokens} tokens`;
      return { logText: summary, tokens };
    }
    default:
      // system init, user (tool results) — silent (no log noise).
      return {};
  }
}
