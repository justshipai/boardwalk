import { NextResponse } from 'next/server';

// Proxies one turn of the in-app agent to OpenAI Chat Completions. Tool *execution* happens on the
// client (it mutates the live canvas via the same WebMCP actions), so this endpoint only runs the
// model and returns its next message (which may contain tool calls). The key stays on the server.
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'The AI is not configured. Set OPENAI_API_KEY.' }, { status: 501 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const model = process.env.AGENT_MODEL?.trim() || 'gpt-4o';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: body.messages,
      tools: body.tools ?? undefined,
      tool_choice: 'auto',
      parallel_tool_calls: true,
      temperature: 0.3,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: 'The AI request failed.', detail: data }, { status: 502 });
  }
  return NextResponse.json({ message: data.choices?.[0]?.message ?? null });
}
