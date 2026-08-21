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
 * 공개 배포본에서 아무나 반복 호출하면 그대로 청구되므로 네 겹으로 막습니다.
 *
 *   1. 같은 출처에서 온 요청만 받는다 (브라우저를 통한 타 사이트 남용 차단)
 *   2. IP 당 분당 호출 수      — 스크립트로 몰아치는 것을 끊는다
 *   3. IP 당 하루 호출 수      — 한 사람이 하루 종일 갉아먹는 것을 막는다
 *   4. 인스턴스 전체 하루 호출 수 — 여러 IP 로 나눠 와도 총액을 묶는다
 *
 * 한 세션이 시나리오 하나(5턴)를 끝내는 데 캐릭터 대사 5회 + 다시 듣기
 * 몇 번이면 충분합니다. IP 당 하루 40회면 정상 사용자는 걸릴 일이 없고,
 * 남용은 확실히 끊깁니다.
 *
 * ⚠ 한계 — 상태가 서버 인스턴스 메모리에 있습니다. 서버리스에서는 인스턴스
 * 마다 따로 세므로 4번도 진짜 전역 상한은 아닙니다. 인스턴스가 늘면 그만큼
 * 곱해집니다. **비용의 실질적인 방어선은 OpenAI 대시보드의 예산 상한**이고,
 * 이 코드는 그 한도에 닿기까지의 속도를 늦추는 역할입니다.
 * 정확한 전역 상한이 필요해지면 Vercel KV 같은 공유 저장소로 옮기세요.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_DAY = 40;
const MAX_TOTAL_PER_DAY = 600;

type Bucket = { count: number; resetAt: number };

const perMinute = new Map<string, Bucket>();
const perDay = new Map<string, Bucket>();
let instanceDay: Bucket = { count: 0, resetAt: 0 };

/** 만료된 항목을 걷어내 Map 이 무한히 커지지 않게 합니다. */
function sweep(map: Map<string, Bucket>, now: number) {
  if (map.size <= 1000) return;
  for (const [key, value] of map) if (now >= value.resetAt) map.delete(key);
}

/** 시간창 하나를 세고, 상한을 넘었는지 알려줍니다. */
function bump(map: Map<string, Bucket>, key: string, now: number, windowMs: number, max: number) {
  const entry = map.get(key);
  if (!entry || now >= entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    sweep(map, now);
    return { exceeded: false, resetAt: now + windowMs };
  }
  entry.count += 1;
  return { exceeded: entry.count > max, resetAt: entry.resetAt };
}

type LimitResult = { ok: true } | { ok: false; message: string; retryAfter: number };

function checkLimits(ip: string, now: number): LimitResult {
  // 4. 인스턴스 전체 — 가장 먼저 본다. 여기서 막히면 개별 카운터를 올릴 필요가 없다.
  if (now >= instanceDay.resetAt) instanceDay = { count: 0, resetAt: now + DAY_MS };
  if (instanceDay.count >= MAX_TOTAL_PER_DAY) {
    return {
      ok: false,
      retryAfter: Math.ceil((instanceDay.resetAt - now) / 1000),
      message: "오늘 서버 음성 사용량을 모두 썼습니다. 브라우저 내장 음성으로 계속 연습할 수 있습니다."
    };
  }

  // 2. 분당
  const minute = bump(perMinute, ip, now, WINDOW_MS, MAX_PER_WINDOW);
  if (minute.exceeded) {
    return {
      ok: false,
      retryAfter: Math.ceil((minute.resetAt - now) / 1000),
      message: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요."
    };
  }

  // 3. 하루
  const day = bump(perDay, ip, now, DAY_MS, MAX_PER_DAY);
  if (day.exceeded) {
    return {
      ok: false,
      retryAfter: Math.ceil((day.resetAt - now) / 1000),
      message: "오늘 서버 음성 사용 한도에 도달했습니다. 브라우저 내장 음성으로 계속 연습할 수 있습니다."
    };
  }

  instanceDay.count += 1;
  return { ok: true };
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

  const limit = checkLimits(clientIp(request), Date.now());
  if (!limit.ok) {
    return Response.json(
      { error: limit.message },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
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
