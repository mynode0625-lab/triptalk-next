/**
 * 후기 관리 — 감추기 · 다시 보이기 · 삭제
 *
 * 관리자는 서버 설정에 있는 **한 계정**뿐입니다. 로그인은 `/api/admin/session` 에서
 * 하고, 여기서는 그때 발급된 **관리자 쿠키만** 봅니다 — 비밀번호가 매 요청에 실려
 * 다니지 않게 하려는 것입니다. 자세한 배경은 `lib/auth/adminSession.ts` 주석 참고.
 *
 * 환경변수: ADMIN_ID · ADMIN_PASSWORD (서버 전용 — NEXT_PUBLIC_ 금지)
 * 둘 중 하나라도 없으면 이 경로 전체가 501 이고 관리 화면도 열리지 않습니다.
 */
import type { NextRequest } from "next/server";
import { dbReady } from "@/lib/db/client";
import { deleteReview, listAllReviews, setReviewStatus } from "@/lib/db/reviews";
import { adminConfigured, readAdminSession } from "@/lib/auth/adminSession";

const fail = (message: string, status: number) =>
  Response.json({ error: message }, { status });

/** 통과하면 null, 막히면 그대로 돌려줄 응답 */
async function guard(): Promise<Response | null> {
  if (!adminConfigured()) return fail("관리 계정이 설정되지 않았습니다.", 501);
  if (!dbReady()) return fail("데이터베이스가 설정되지 않았습니다.", 501);
  if (!(await readAdminSession())) return fail("관리자로 로그인해 주세요.", 401);
  return null;
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;

  return Response.json(
    { reviews: await listAllReviews() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

type Body = { id?: unknown; status?: unknown };

async function readId(request: NextRequest): Promise<{ id: string; status?: unknown } | null> {
  try {
    const { id, status } = (await request.json()) as Body;
    if (typeof id !== "string" || !id) return null;
    return { id, status };
  } catch {
    return null;
  }
}

/** 감추기 · 다시 보이기 */
export async function PATCH(request: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;

  const parsed = await readId(request);
  if (!parsed) return fail("id 가 필요합니다.", 400);
  if (parsed.status !== "visible" && parsed.status !== "hidden") {
    return fail("status 는 visible 또는 hidden 이어야 합니다.", 400);
  }

  const ok = await setReviewStatus(parsed.id, parsed.status);
  return ok ? Response.json({ ok: true }) : fail("상태를 바꾸지 못했습니다.", 500);
}

/** 완전 삭제 — 되돌릴 수 없습니다 */
export async function DELETE(request: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;

  const parsed = await readId(request);
  if (!parsed) return fail("id 가 필요합니다.", 400);

  const ok = await deleteReview(parsed.id);
  return ok ? Response.json({ ok: true }) : fail("삭제하지 못했습니다.", 500);
}
