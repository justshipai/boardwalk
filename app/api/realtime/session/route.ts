import { NextResponse } from 'next/server';

// Mints a short-lived Realtime client secret so the browser can open a WebRTC voice session
// without ever seeing the API key. Returns 501 until OPENAI_API_KEY is set.
const DEFAULT_MODEL = 'gpt-realtime-2';
const DEFAULT_VOICE = 'marin';
const isValidModel = (m: string) => /^gpt-realtime(-\d|$)/.test(m) && m !== 'gpt-realtime-2.1';

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Voice is not configured. Set OPENAI_API_KEY to enable it.' }, { status: 501 });
  }

  const configured = process.env.REALTIME_MODEL?.trim();
  const model = configured && isValidModel(configured) ? configured : DEFAULT_MODEL;

  const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: { type: 'realtime', model, audio: { output: { voice: DEFAULT_VOICE } } } }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: 'Could not create a voice session', detail: data }, { status: 502 });
  }
  return NextResponse.json({ ...data, model: data?.session?.model ?? model });
}
