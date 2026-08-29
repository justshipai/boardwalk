# Boardwalk

**A shared space for thinking with agents.**

Boardwalk is a live, infinite canvas for turning half-formed ideas into a shared map. You add the fragments; an agent helps organise, connect, challenge, and reshape them—directly in the same canvas you are watching.

This is an entry for the 2026 OpenAI WebMCP Challenge.

> Chat is where ideas are described. Boardwalk is where they take shape together.

## Why WebMCP

An agent should not have to guess at pixels or narrate a diagram back to you. Boardwalk exposes the canvas as a set of structured, contextual WebMCP tools, so an agent can read the current map and make precise, visible edits alongside the human.

Open a deployed Boardwalk page in ChatGPT's in-app browser, then ask ChatGPT to use the page's **Site tools**. It can add and connect shapes, reorganise the map, and title the session while you see every action happen on the same canvas.

The defining moment is a working session: a messy launch brainstorm becomes a decision-ready map of objectives, audiences, moments, risks, owners, and open questions—with both people and agents contributing to the shared spatial artifact.

## How it works

Every action is defined once in [`src/actions/definitions.ts`](src/actions/definitions.ts): its description, JSON Schema, availability, and handler. That registry produces:

1. WebMCP registrations via [`src/actions/webmcp.ts`](src/actions/webmcp.ts)
2. OpenAI tool definitions for Boardwalk's optional chat and voice collaborator
3. The visible **Site tools** activity feed

`executeAction()` in [`src/actions/registry.ts`](src/actions/registry.ts) is the only mutation path for agents, so each collaboration surface changes the canvas in the same way.

### Tool catalogue

- **Read:** `get_canvas`
- **Create and organise:** `add_shape`, `connect_shapes`, `update_shape`, `delete_shape`, `auto_layout`
- **Session control:** `set_title`, `clear_canvas`

The tool set is contextual. For example, `connect_shapes` appears only after there are at least two shapes; editing and layout tools appear once the canvas has content. The live counter and activity feed make that lifecycle explicit.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Start with **Run a launch war room** to create the project’s demo-ready collaboration.

### Optional built-in chat and voice collaborator

Boardwalk can run its own text and voice collaborator using the OpenAI API. This is separate from collaborating through ChatGPT's browser Site tools.

```bash
cp .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local`. You can also set `AGENT_MODEL` and `REALTIME_MODEL`. The Realtime route mints a short-lived client secret; the standard API key never reaches the browser.

Without an API key, the canvas still works normally and WebMCP tools remain available to a compatible browser agent.

### Inspect the live tools

In the browser console:

```js
await document.modelContext.getTools();
await document.modelContext.__call('get_canvas', {}); // polyfill helper in unsupported browsers
```

## Stack

Next.js · TypeScript · Tailwind CSS · Zustand · Excalidraw · WebMCP · OpenAI Realtime (WebRTC)

## License

MIT — see [LICENSE](LICENSE).
