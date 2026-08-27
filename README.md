# Boardwalk

**The board meeting before the board meeting.**

Boardwalk is a live board-meeting rehearsal environment for founders. You present your company update; an AI board challenges the numbers, questions the story and remembers what you promised last time — and it does this by operating the same shared boardroom you are presenting in, through [WebMCP](https://github.com/webmachinelearning/webmcp) tools.

This is an entry to the 2026 OpenAI WebMCP Challenge.

> The defining experience is a meeting that pushes back. The founder speaks, the board interrupts, the evidence appears on screen, the founder responds, and the meeting state changes in front of both of them.

## Why WebMCP is necessary here

A board meeting combines three things chat and document-review tools handle badly together: rich source material spread across slides and metrics, a live high-pressure conversation, and a **shared visual state both parties inspect and change**.

Boardwalk's board doesn't describe changes in a chat pane — it *makes* them in the live page: it focuses a metric, flags an unsupported claim on the slide, resurfaces a prior commitment, and drafts a decision for you to accept or reject. WebMCP is what lets the agent reach into the same interface the human is using instead of replacing it. Because the tools are registered on the page with `document.modelContext.registerTool`, the built-in browser agents in ChatGPT and Codex can discover and drive the exact same boardroom — proving Boardwalk is genuinely agent-native, not a private voice agent wearing a WebMCP badge.

## The single action registry

Every board action is defined **once** in [`src/actions/definitions.ts`](src/actions/definitions.ts) — name, description, JSON Schema, annotations, availability predicate and handler. From that one definition Boardwalk derives:

1. the WebMCP registrations (`document.modelContext.registerTool`), via [`src/actions/webmcp.ts`](src/actions/webmcp.ts)
2. the OpenAI Realtime function-tool definitions (voice), via [`src/actions/registry.ts`](src/actions/registry.ts)
3. the visible Site-tools activity feed

`executeAction()` in [`src/actions/registry.ts`](src/actions/registry.ts) is the **only** mutation path for agent-initiated changes, so the voice board and ChatGPT can never drift into different behaviour.

### Tool catalogue (12 tools)

- **Read** (`readOnlyHint`): `get_meeting_context`, `get_current_slide`, `get_metric_detail`, `get_previous_commitments`
- **Interaction**: `focus_evidence`, `raise_board_question`, `flag_assumption`, `request_metric_drilldown`, `propose_commitment`, `record_decision`, `set_meeting_phase`, `generate_board_readout`

### Dynamic tool lifecycle

Tools register and unregister as the meeting moves. `request_metric_drilldown` only exists while the active slide exposes a metric; `generate_board_readout` only after the meeting has at least one intervention. Watch the counter in the Site-tools panel move as you present.

## Run it

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and choose **Try the demo**. No account, no upload — it runs a fictional company, Northstar.

### Inspect the WebMCP tools

In the browser console on the meeting page:

```js
await document.modelContext.getTools();            // list live tools
await document.modelContext.__call('get_current_slide', {}); // (polyfill helper) invoke one
```

In Chrome 149+ with WebMCP enabled, or in ChatGPT's in-app browser, the native implementation is used automatically and the built-in agent can discover the same tools.

## Voice

The Realtime speech-to-speech board runs over WebRTC against `gpt-realtime-2`. The server mints a short-lived client secret in [`app/api/realtime/session/route.ts`](app/api/realtime/session/route.ts); the standard API key never reaches the browser. Realtime function calls run through the same `executeAction` path as WebMCP, and the tool set is re-sent after each call so the dynamic lifecycle carries over to voice. If the microphone is denied, the session still connects and you drive the board by typing.

Until `OPENAI_API_KEY` is set, Boardwalk runs in **text rehearsal mode**: you present in text and a deterministic board director drives the same tools, so both signature moments work with no key.

```bash
cp .env.example .env.local   # then add OPENAI_API_KEY
```

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · Zustand · WebMCP · OpenAI Realtime (WebRTC).

## Licence

MIT — see [LICENSE](LICENSE).
