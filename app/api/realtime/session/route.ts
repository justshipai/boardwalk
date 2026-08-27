import { NextResponse } from 'next/server';

// Mints a short-lived Realtime client secret so the browser can open a WebRTC session without
// ever seeing the standard API key (§8.5). Voice wiring lands in the next build; until OPENAI_API_KEY
// is set this returns a clear 501 and the app runs in text rehearsal mode.
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.REALTIME_MODEL ?? 'gpt-realtime-2.1';

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

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: 'Could not create a realtime session', detail }, { status: 502 });
  }

  return NextResponse.json(await res.json());
}
