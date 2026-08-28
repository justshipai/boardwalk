import { useActivity } from '@/state/activity-store';
import { useCanvasMeta } from '@/canvas/stores';
import { ensureModelContext, type McpToolHandle } from '@/webmcp/polyfill';
import { boardActions } from './definitions';
import { executeAction, toWebMcpResult } from './registry';

// Syncs the set of registered WebMCP tools to the canvas state: tools appear and disappear as the
// canvas fills (e.g. connect_shapes only once there are two shapes to connect).
export function startWebMcpSync(): () => void {
  const modelContext = ensureModelContext();
  const handles = new Map<string, McpToolHandle>();

  const sync = () => {
    const desired = new Set(boardActions.filter((a) => a.isAvailable()).map((a) => a.name));

    for (const action of boardActions) {
      const isRegistered = handles.has(action.name);
      const shouldRegister = desired.has(action.name);

      if (shouldRegister && !isRegistered) {
        const handle = modelContext.registerTool({
          name: action.name,
          description: action.description,
          inputSchema: action.inputSchema,
          annotations: action.annotations,
          execute: (args) => toWebMcpResult(executeAction(action.name, args)),
        });
        handles.set(action.name, handle);
        useActivity.getState().log({ kind: 'register', tool: action.name });
      } else if (!shouldRegister && isRegistered) {
        handles.get(action.name)?.unregister();
        handles.delete(action.name);
        useActivity.getState().log({ kind: 'unregister', tool: action.name });
      }
    }

    useActivity.getState().setRegistered([...handles.keys()]);
  };

  sync();
  const unsubscribe = useCanvasMeta.subscribe(sync);
  return () => {
    unsubscribe();
    for (const handle of handles.values()) handle.unregister();
    handles.clear();
    useActivity.getState().setRegistered([]);
  };
}
