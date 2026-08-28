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
  effect?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BoardAction<Args = any> {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  annotations: ActionAnnotations;
  isAvailable: () => boolean;
  handler: (args: Args) => ActionResult;
}
