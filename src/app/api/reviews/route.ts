/**
 * 후기 읽기·쓰기
 *
 * 랜딩의 후기 섹션이 쓰는 유일한 통로입니다. 브라우저는 Supabase 를 직접 부르지
 * 않습니다 — `service_role` 키가 나가야 하므로 애초에 불가능합니다.
 *
 * ⚠ **누구나 쓸 수 있는 엔드포인트입니다.** 공개된 사이트에 열려 있는 쓰기 구멍이라
 * 아래를 겹쳐 둡니다.
 *
 *   1. 같은 출처에서 온 요청만 받는다
 *   2. 길이 상한 — 긴 본문을 밀어 넣는 것을 막는다
 *   3. IP 당 하루 쓰기 횟수
 *   4. 저장된 글은 `hidden` 을 켜서 감출 수 있다 (Supabase 대시보드에서)
 *
 * ⚠ 자동 검열은 없습니다. 부적절한 글이 올라오면 사람이 감춰야 합니다. 공개 서비스로
 * 오래 운영하려면 신고 버튼과 검토 화면이 필요합니다 — 지금은 없습니다.
 * 상태가 인스턴스 메모리라 3번도 인스턴스마다 따로 셉니다 (`/api/tts` 와 같은 한계).
 */
import type { NextRequest } from "next/server";
import {
  BODY_MAX, BODY_MIN, NICKNAME_MAX, createReview, listReviews
} from "@/lib/db/reviews";
import { dbReady } from "@/lib/db/client";

/** 한 IP 가 하루에 남길 수 있는 후기 수 */
const MAX_PER_IP_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

type Bucket = { count: number; resetAt: number };
const perIpDay = new Map<string, Bucket>();

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** 다른 사이트의 스크립트가 브라우저를 통해 쓰는 것을 막습니다. */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;                     // 브라우저가 아닌 요청(curl 등)은 아래 상한이 받는다
  return origin === request.nextUrl.origin;
}

export async function GET() {
  if (!dbReady()) return Response.json({ reviews: [], enabled: false });
  return Response.json(
    { reviews: await listReviews(), enabled: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}

type Body = { nickname?: unknown; rating?: unknown; body?: unknown };

const fail = (message: string, status: number) =>
  Response.json({ error: message }, { status });

export async function POST(request: NextRequest) {
  if (!dbReady()) return fail("후기 기능이 아직 켜져 있지 않습니다.", 501);
  if (!sameOrigin(request)) return fail("허용되지 않은 요청입니다.", 403);

  const now = Date.now();
  const ip = clientIp(request);
  const entry = perIpDay.get(ip);
  if (!entry || now >= entry.resetAt) {
    perIpDay.set(ip, { count: 1, resetAt: now + DAY_MS });
  } else if (entry.count >= MAX_PER_IP_DAY) {
    return fail("오늘 남길 수 있는 후기를 모두 사용했습니다.", 429);
  } else {
    entry.count += 1;
  }

  let payload: Body;
  try { payload = (await request.json()) as Body; }
  catch { return fail("잘못된 요청 본문입니다.", 400); }

  const nickname = typeof payload.nickname === "string" ? payload.nickname.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const rating = Number(payload.rating);

  if (!nickname || nickname.length > NICKNAME_MAX) {
    return fail(`이름은 1~${NICKNAME_MAX}자로 적어주세요.`, 400);
  }
  if (body.length < BODY_MIN || body.length > BODY_MAX) {
    return fail(`후기는 ${BODY_MIN}~${BODY_MAX}자로 적어주세요.`, 400);
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail("별점을 골라주세요.", 400);
  }

  const saved = await createReview({ nickname, rating, body });
  if (!saved) return fail("후기를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);

  return Response.json({ review: saved }, { status: 201 });
}
