import type { Meeting } from '@/state/types';

export interface JSONSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ActionResult {
  summary: string;
  data?: Record<string, unknown>;
}

export interface ActionAnnotations {
  title: string;
  readOnlyHint?: boolean;
  // human-readable description of the visible side effect, surfaced to agents and the activity feed
  effect?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BoardAction<Args = any> {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  annotations: ActionAnnotations;
  // self-contained availability predicate — drives the dynamic WebMCP lifecycle (§8.4)
  isAvailable: (meeting: Meeting) => boolean;
  handler: (args: Args, meeting: Meeting) => ActionResult;
}
