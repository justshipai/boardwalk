import { NextResponse } from 'next/server';

// Mints a short-lived Realtime client secret so the browser can open a WebRTC session without
// ever seeing the standard API key (§8.5). Until OPENAI_API_KEY is set this returns a clear 501
// and the app runs in text rehearsal mode.
const DEFAULT_MODEL = 'gpt-realtime-2';
// only accept a real realtime snapshot; "realtime" and the PRD's "gpt-realtime-2.1" both mint a
// generic session the /calls endpoint rejects, so anything else falls back to the working default
const isValidModel = (m: string) => /^gpt-realtime(-\d|$)/.test(m) && m !== 'gpt-realtime-2.1';

const VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar']);

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const configured = process.env.REALTIME_MODEL?.trim();
  const model = configured && isValidModel(configured) ? configured : DEFAULT_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Realtime voice is not configured. Set OPENAI_API_KEY to enable it.' },
      { status: 501 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const voice = typeof body?.voice === 'string' && VOICES.has(body.voice) ? body.voice : undefined;
  const session: Record<string, unknown> = { type: 'realtime', model };
  if (voice) session.audio = { output: { voice } };

  const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: 'Could not create a realtime session', detail: data }, { status: 502 });
  }

  // echo the model actually minted so the client uses the same one for the SDP exchange
  return NextResponse.json({ ...data, model: data?.session?.model ?? model });
}
