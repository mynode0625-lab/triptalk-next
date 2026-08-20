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

/* ── 호출 제한 ──────────────────────────────────────────────────
 * 이 엔드포인트는 호출될 때마다 서버의 OpenAI 키로 실제 비용이 나갑니다.
 * 공개 배포본에서 아무나 반복 호출하면 그대로 청구되므로 두 겹으로 막습니다.
 *
 *   1. 같은 출처에서 온 요청만 받는다 (브라우저를 통한 타 사이트 남용 차단)
 *   2. IP 당 시간창 호출 수 제한
 *
 * 상태는 서버 인스턴스 메모리에 둡니다. 서버리스에서는 인스턴스마다 따로
 * 세므로 전역 상한은 아니지만, 한 클라이언트의 연속 호출은 확실히 끊습니다.
 * 더 엄격한 제한이 필요해지면 Vercel KV 같은 공유 저장소로 옮기세요.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string, now: number): boolean {
  const entry = hits.get(ip);
  if (!entry || now >= entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // 만료된 항목을 걷어내 Map 이 무한히 커지지 않게 합니다.
    if (hits.size > 1000) {
      for (const [key, value] of hits) if (now >= value.resetAt) hits.delete(key);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

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

  // Origin 이 붙어 있으면 이 사이트의 것이어야 합니다.
  // (같은 출처 fetch 에는 브라우저가 항상 붙입니다.)
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }

  if (rateLimited(clientIp(request), Date.now())) {
    return Response.json(
      { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(WINDOW_MS / 1000) } }
    );
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
