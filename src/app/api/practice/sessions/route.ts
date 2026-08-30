/**
 * 연습 기록 저장·조회·삭제
 *
 * **로그인한 사람만** 씁니다. 비로그인 방문자는 가리킬 열쇠가 없어 행을 누구 앞으로
 * 달지 정할 수 없습니다 (`supabase-plan.md` 3장).
 *
 * ⚠ 작성자와 조회 조건을 **요청 본문에서 받지 않습니다.** 세션 쿠키에서만 얻습니다.
 * 본문의 id 로 조회하면 남의 기록이 그대로 나갑니다. RLS 를 쓰지 않으므로
 * 데이터베이스가 이 실수를 잡아주지 않습니다.
 *
 * ⚠ 지금 로그인은 데모라 sub 가 로그인할 때마다 새로 발급됩니다. 저장은 되지만
 * 로그아웃 후 다시 들어오면 같은 사람으로 찾아주지 못합니다. 신한 SOL 연동으로
 * 고정된 sub 가 들어와야 제 구실을 합니다.
 */
import type { NextRequest } from "next/server";
import { dbReady } from "@/lib/db/client";
import { readSessionCookie } from "@/lib/auth/cookie";
import {
  deleteMyPracticeSessions, listMyPracticeSessions, savePracticeSession
} from "@/lib/db/practice";
import { SCENE_KEYS } from "@/lib/data/scenarios";
import type { SceneKey } from "@/types/practice";
import { HOUR, clientIp, hit } from "@/lib/server/rateLimit";

/** 한 IP 가 한 시간에 저장할 수 있는 기록 수. 사람이 연습하기에는 넉넉합니다. */
const MAX_PER_IP_HOUR = 30;

const fail = (message: string, status: number) =>
  Response.json({ error: message }, { status });

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === request.nextUrl.origin;
}

export async function GET() {
  if (!dbReady()) return Response.json({ sessions: [], enabled: false });

  const session = await readSessionCookie();
  if (!session) return Response.json({ sessions: [], enabled: true, signedIn: false });

  return Response.json(
    {
      sessions: await listMyPracticeSessions(session.provider, session.sub),
      enabled: true,
      signedIn: true
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

type Body = {
  sceneKey?: unknown;
  turns?: unknown;
  avgScore?: unknown;
  scores?: unknown;
  corrections?: unknown;
  words?: unknown;
};

/** 화면에서 온 배열을 그대로 믿지 않고 모양과 길이를 맞춰 둡니다. */
const asArray = (v: unknown, max: number): unknown[] =>
  Array.isArray(v) ? v.slice(0, max) : [];

export async function POST(request: NextRequest) {
  if (!dbReady()) return fail("기록 저장이 아직 켜져 있지 않습니다.", 501);
  if (!sameOrigin(request)) return fail("허용되지 않은 요청입니다.", 403);

  const session = await readSessionCookie();
  // 로그인하지 않은 사람의 연습을 막지는 않습니다. 저장만 하지 않습니다.
  if (!session) return Response.json({ saved: false, reason: "signed-out" });

  const limit = hit("practice:save", clientIp(request), MAX_PER_IP_HOUR, HOUR);
  if (!limit.ok) return Response.json({ saved: false, reason: "too-many" });

  let payload: Body;
  try { payload = (await request.json()) as Body; }
  catch { return fail("잘못된 요청 본문입니다.", 400); }

  const asked = typeof payload.sceneKey === "string" ? payload.sceneKey : "";
  if (!(SCENE_KEYS as string[]).includes(asked)) return fail("알 수 없는 장면입니다.", 400);

  const turns = Number(payload.turns);
  if (!Number.isInteger(turns) || turns < 0 || turns > 20) return fail("turns 가 올바르지 않습니다.", 400);

  /* 점수가 "없음"(null)과 "0점"은 다릅니다. Number(null) 이 0 이라 그냥 변환하면
     타이핑으로만 연습한 기록이 0점으로 남습니다. 없음을 먼저 걸러냅니다. */
  const avgScore =
    payload.avgScore === null || payload.avgScore === undefined
      ? null
      : Number.isFinite(Number(payload.avgScore))
        ? Math.max(0, Math.min(100, Math.round(Number(payload.avgScore))))
        : null;

  const scores = asArray(payload.scores, 20)
    .map(n => Number(n))
    .filter(n => Number.isFinite(n))
    .map(n => Math.max(0, Math.min(100, Math.round(n))));

  const ok = await savePracticeSession({
    provider: session.provider,
    sub: session.sub,
    sceneKey: asked as SceneKey,
    turns,
    avgScore,
    scores,
    corrections: asArray(payload.corrections, 30) as never,
    words: asArray(payload.words, 30) as never
  });

  return Response.json({ saved: ok });
}

/** 본인 기록 전부 삭제 */
export async function DELETE(request: NextRequest) {
  if (!dbReady()) return fail("기록 저장이 아직 켜져 있지 않습니다.", 501);
  if (!sameOrigin(request)) return fail("허용되지 않은 요청입니다.", 403);

  const session = await readSessionCookie();
  if (!session) return fail("로그인한 뒤에 지울 수 있습니다.", 401);

  const ok = await deleteMyPracticeSessions(session.provider, session.sub);
  return ok ? Response.json({ ok: true }) : fail("지우지 못했습니다.", 500);
}
