// Minimal document.modelContext polyfill so Boardwalk's tools are registrable and inspectable
// in any browser during development. Chrome 149+ ships a native implementation; when present we
// use it so ChatGPT and Codex can discover the same tools against the live page.

export interface McpToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: object;
  execute: (args: Record<string, unknown>, options: { signal?: AbortSignal }) => Promise<McpToolResult> | McpToolResult;
}

export interface McpToolHandle {
  unregister: () => void;
}

export interface ModelContext {
  registerTool: (descriptor: McpToolDescriptor) => McpToolHandle;
  getTools: () => Promise<{ name: string; description: string; inputSchema: object }[]>;
  // convenience for manual/console testing against the polyfill
  __call?: (name: string, args: Record<string, unknown>) => Promise<McpToolResult>;
  __isPolyfill?: boolean;
}

type DocWithContext = Document & { modelContext?: ModelContext };

export function ensureModelContext(): ModelContext {
  if (typeof document === 'undefined') {
    throw new Error('ensureModelContext must run in the browser');
  }
  const doc = document as DocWithContext;
  if (doc.modelContext && typeof doc.modelContext.registerTool === 'function') {
    return doc.modelContext;
  }

  const tools = new Map<string, McpToolDescriptor>();
  const polyfill: ModelContext = {
    __isPolyfill: true,
    registerTool(descriptor) {
      tools.set(descriptor.name, descriptor);
      return { unregister: () => tools.delete(descriptor.name) };
    },
    async getTools() {
      return [...tools.values()].map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
    },
    async __call(name, args) {
      const tool = tools.get(name);
      if (!tool) throw new Error(`Tool "${name}" is not registered`);
      return tool.execute(args, {});
    },
  };
  doc.modelContext = polyfill;
  return polyfill;
}
