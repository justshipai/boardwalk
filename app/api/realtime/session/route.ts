import { NextResponse } from 'next/server';

// Mints a short-lived Realtime client secret so the browser can open a WebRTC session without
// ever seeing the standard API key (§8.5). Until OPENAI_API_KEY is set this returns a clear 501
// and the app runs in text rehearsal mode.
const DEFAULT_MODEL = 'gpt-realtime-2';
// "gpt-realtime-2.1" appears in the PRD but is not a real model id — it mints a generic session
const INVALID_MODELS = new Set(['gpt-realtime-2.1']);

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  const configured = process.env.REALTIME_MODEL;
  const model = configured && !INVALID_MODELS.has(configured) ? configured : DEFAULT_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Realtime voice is not configured. Set OPENAI_API_KEY to enable it.' },
      { status: 501 },
    );
  }

  const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: { type: 'realtime', model } }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: 'Could not create a realtime session', detail: data }, { status: 502 });
  }

  // echo the model actually minted so the client uses the same one for the SDP exchange
  return NextResponse.json({ ...data, model: data?.session?.model ?? model });
}
