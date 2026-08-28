import { useActivity } from '@/state/activity-store';
import { useCanvas } from '@/canvas/canvas-store';
import { actionByName, boardActions } from './definitions';
import type { ActionResult } from './types';

export interface ExecuteOutcome extends ActionResult {
  ok: boolean;
  error?: string;
}

// the ONLY mutation path for agent-initiated changes — used by the WebMCP execute callback,
// the text-input fallback, and (when voice lands) the Realtime function-call handler
export function executeAction(name: string, rawArgs: unknown): ExecuteOutcome {
  const action = actionByName.get(name);
  if (!action) return { ok: false, summary: `Unknown tool "${name}".`, error: 'unknown_tool' };

  const state = useCanvas.getState();
  if (!action.isAvailable(state)) {
    return { ok: false, summary: `Tool "${name}" is not available right now.`, error: 'unavailable' };
  }

  const args = (rawArgs ?? {}) as Record<string, unknown>;
  const missing = (action.inputSchema.required ?? []).filter((key) => args[key] === undefined || args[key] === null);
  if (missing.length > 0) {
    return { ok: false, summary: `Missing required argument(s): ${missing.join(', ')}.`, error: 'invalid_args' };
  }

  try {
    const result = action.handler(args, state);
    useActivity.getState().log({ kind: 'invoke', tool: name, detail: result.summary });
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, summary: `Tool "${name}" failed.`, error: err instanceof Error ? err.message : 'error' };
  }
}

// WebMCP result shape
export function toWebMcpResult(outcome: ExecuteOutcome) {
  return {
    content: [{ type: 'text' as const, text: outcome.summary }],
    structuredContent: outcome.data ?? {},
    isError: !outcome.ok,
  };
}

// OpenAI Realtime function-tool definitions, derived from the same registry (used when voice lands)
export function toRealtimeTools() {
  const state = useCanvas.getState();
  return boardActions
    .filter((a) => a.isAvailable(state))
    .map((a) => ({
      type: 'function' as const,
      name: a.name,
      description: a.description,
      parameters: a.inputSchema,
    }));
}

// OpenAI Chat Completions tool definitions (used by the in-app text agent)
export function toChatTools() {
  return boardActions.map((a) => ({
    type: 'function' as const,
    function: { name: a.name, description: a.description, parameters: a.inputSchema },
  }));
}

export { boardActions };
