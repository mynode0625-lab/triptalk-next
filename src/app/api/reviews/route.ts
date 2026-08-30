/**
 * 후기 읽기·쓰기
 *
 * 랜딩의 후기 섹션이 쓰는 유일한 통로입니다. 브라우저는 Supabase 를 직접 부르지
 * 않습니다 — `service_role` 키가 나가야 하므로 애초에 불가능합니다.
 *
 * **쓰기는 로그인한 사람만** 할 수 있습니다. 익명 쓰기는 막을 수단이 IP 밖에 없어
 * 실효가 없지만, 작성자가 계정에 묶이면 반복 남용자를 끊어낼 수 있습니다.
 * 겹쳐 둔 것은 아래와 같습니다.
 *
 *   1. 세션 쿠키가 있어야 한다 (서버가 서명을 검증한 것만)
 *   2. 차단 목록(`blocked_authors`)에 없어야 한다
 *   3. 길이·별점·장면 값 검증
 *   4. 한 계정에 후기 하나 — 두 번째 글은 자기 글을 고치는 것이 된다 (테이블 제약)
 *   5. 같은 출처에서 온 요청만 받는다
 *   6. **IP 당 하루 작성 수** — 아래 참고
 *
 * ⚠ 로그인만으로는 도배가 막히지 않습니다. 지금 로그인은 데모라 계정을 무제한으로
 * 새로 만들 수 있어서, `/api/auth/demo` 를 다시 부르고 글을 쓰는 것을 반복하면
 * "한 계정 하나" 규칙이 계정을 갈아치우는 것만으로 무너집니다. 그래서 계정과 별개로
 * IP 로도 셉니다. 두 규칙은 서로를 대신하지 못합니다.
 *
 * ⚠ 작성자 정보는 **요청 본문에서 읽지 않습니다.** 세션 쿠키에서만 얻습니다.
 * 본문의 이름·id 를 믿으면 그 자리가 곧 사칭이 됩니다. RLS 를 쓰지 않으므로
 * 데이터베이스가 이 실수를 잡아주지 않습니다.
 *
 * ⚠ 자동 검열은 없습니다. 부적절한 글은 Supabase 대시보드에서 해당 행의 `status`
 * 를 `hidden` 으로 바꿔 감춥니다. 반복되면 `blocked_authors` 에 추가합니다.
 * 신고 버튼과 검토 화면은 아직 없습니다.
 */
import type { NextRequest } from "next/server";
import {
  BODY_MAX, BODY_MIN, deleteMyReview, findMyReview, isBlocked, listReviews, upsertReview
} from "@/lib/db/reviews";
import { dbReady } from "@/lib/db/client";
import { readSessionCookie } from "@/lib/auth/cookie";
import { DAY, clientIp, hit } from "@/lib/server/rateLimit";
import { SCENE_KEYS } from "@/lib/data/scenarios";

/** 한 IP 가 하루에 만들 수 있는 후기 수 (고치는 것은 세지 않습니다) */
const MAX_PER_IP_DAY = 3;

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;                 // 브라우저가 아닌 요청은 아래 로그인 검사가 받는다
  return origin === request.nextUrl.origin;
}

/**
 * 목록과 함께 "지금 이 사람이 쓸 수 있는지", "이미 남긴 글이 있는지" 를 알려줍니다.
 * 화면이 로그인 안내를 띄울지, 새로 쓰기를 띄울지, 수정·삭제를 띄울지 정하는 데 씁니다.
 */
export async function GET() {
  if (!dbReady()) {
    return Response.json({ reviews: [], enabled: false, canWrite: false, mine: null });
  }

  const [reviews, session] = await Promise.all([listReviews(), readSessionCookie()]);
  const mine = session ? await findMyReview(session.provider, session.sub) : null;

  return Response.json(
    { reviews, enabled: true, canWrite: Boolean(session), mine },
    { headers: { "Cache-Control": "no-store" } }
  );
}

type Body = { rating?: unknown; body?: unknown; sceneKey?: unknown };

const fail = (message: string, status: number) =>
  Response.json({ error: message }, { status });

export async function POST(request: NextRequest) {
  if (!dbReady()) return fail("후기 기능이 아직 켜져 있지 않습니다.", 501);
  if (!sameOrigin(request)) return fail("허용되지 않은 요청입니다.", 403);

  const session = await readSessionCookie();
  if (!session) return fail("후기는 로그인한 뒤에 남길 수 있습니다.", 401);

  if (await isBlocked(session.provider, session.sub)) {
    return fail("후기를 남길 수 없는 계정입니다.", 403);
  }

  /* 이미 남긴 사람이 자기 글을 고치는 것은 새 글이 아니므로 세지 않습니다.
     세면 하루 세 번 고치고 나서 더는 못 고치게 됩니다. */
  const mine = await findMyReview(session.provider, session.sub);
  if (!mine) {
    const limit = hit("review:create", clientIp(request), MAX_PER_IP_DAY, DAY);
    if (!limit.ok) {
      return Response.json(
        { error: "오늘 남길 수 있는 후기를 모두 사용했습니다." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }
  }

  let payload: Body;
  try { payload = (await request.json()) as Body; }
  catch { return fail("잘못된 요청 본문입니다.", 400); }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const rating = Number(payload.rating);

  /* 아는 장면 값만 받습니다. 아무 문자열이나 그대로 저장하면 길이 제한도 없는
     칸에 무엇이든 밀어 넣을 수 있습니다. */
  const asked = typeof payload.sceneKey === "string" ? payload.sceneKey : null;
  const sceneKey = asked && (SCENE_KEYS as string[]).includes(asked) ? asked : null;

  if (body.length < BODY_MIN || body.length > BODY_MAX) {
    return fail(`후기는 ${BODY_MIN}~${BODY_MAX}자로 적어주세요.`, 400);
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail("별점을 골라주세요.", 400);
  }

  const saved = await upsertReview({
    provider: session.provider,
    sub: session.sub,
    name: session.name,
    rating,
    body,
    sceneKey
  });
  if (!saved) return fail("후기를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);

  return Response.json({ review: saved }, { status: 201 });
}

/**
 * 자기 후기 삭제.
 *
 * 지울 대상을 **요청 본문에서 받지 않습니다.** 세션의 작성자로 찾아 지웁니다 —
 * id 를 받으면 남의 id 를 보낸 사람이 남의 글을 지울 수 있습니다.
 */
export async function DELETE(request: NextRequest) {
  if (!dbReady()) return fail("후기 기능이 아직 켜져 있지 않습니다.", 501);
  if (!sameOrigin(request)) return fail("허용되지 않은 요청입니다.", 403);

  const session = await readSessionCookie();
  if (!session) return fail("로그인한 뒤에 지울 수 있습니다.", 401);

  const ok = await deleteMyReview(session.provider, session.sub);
  return ok ? Response.json({ ok: true }) : fail("지우지 못했습니다.", 500);
}
