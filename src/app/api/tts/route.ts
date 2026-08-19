/**
 * 서버 TTS — OpenAI `gpt-4o-mini-tts`
 *
 * 브라우저 내장 음성은 기기에 설치된 음성 품질에 좌우돼서, 기본 음성만 깔린
 * 기기에서는 아무리 골라도 기계처럼 들립니다. 서버에 키를 하나 두면 방문자가
 * 각자 키를 넣지 않아도 사람에 가까운 음성으로 읽어줍니다.
 *
 * 환경변수: OPENAI_API_KEY (서버 전용 — NEXT_PUBLIC_ 을 붙이지 마세요)
 * 키가 없으면 501 을 돌려주고, 클라이언트는 브라우저 내장 음성으로 되돌아갑니다.
 */
import type { NextRequest } from "next/server";

/** OpenAI 가 지원하는 음성만 통과시킵니다. */
const VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"
]);

const DEFAULT_VOICE = "nova";
const DEFAULT_INSTRUCTIONS =
  "Speak natural, conversational American English — the relaxed rhythm of a real person " +
  "talking, with connected speech and normal contractions. Never robotic or word-by-word.";

/** 한 문장짜리 대사만 읽습니다. 긴 본문을 밀어 넣는 것을 막는 상한선입니다. */
const MAX_CHARS = 400;

type Body = { text?: string; voice?: string; instructions?: string };

/** 서버에 키가 있는지만 알려줍니다. 오디오를 만들지 않으므로 비용이 들지 않습니다. */
export async function GET() {
  return Response.json({ available: !!process.env.OPENAI_API_KEY });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // 501 = 서버에 키가 없음. 클라이언트가 이 응답을 보고 내장 음성으로 넘어갑니다.
    return Response.json({ error: "서버 TTS 키가 설정되지 않았습니다." }, { status: 501 });
  }

  let body: Body;
  try { body = (await request.json()) as Body; }
  catch { return Response.json({ error: "잘못된 요청 본문입니다." }, { status: 400 }); }

  const text = (body.text ?? "").trim();
  if (!text) return Response.json({ error: "text 가 필요합니다." }, { status: 400 });
  if (text.length > MAX_CHARS) {
    return Response.json({ error: `text 는 ${MAX_CHARS}자를 넘을 수 없습니다.` }, { status: 413 });
  }

  const voice = body.voice && VOICES.has(body.voice) ? body.voice : DEFAULT_VOICE;

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
      instructions: body.instructions?.slice(0, 500) || DEFAULT_INSTRUCTIONS,
      response_format: "mp3"
    }),
    cache: "no-store"
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    console.error("[TripTalk] TTS 실패", res.status, detail);
    return Response.json({ error: "음성을 만들지 못했습니다." }, { status: 502 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      // 같은 대사는 반복 재생되므로 브라우저가 캐시하도록 둡니다.
      "Cache-Control": "private, max-age=86400"
    }
  });
}
