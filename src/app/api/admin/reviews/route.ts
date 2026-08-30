/**
 * 후기 관리 — 감추기 · 다시 보이기 · 삭제
 *
 * **누가 관리자인지를 계정으로 가리지 않습니다.** 지금 로그인은 신한 SOL 연동 키가
 * 없어 데모로 돌고, 데모 세션은 방문자마다 임시로 발급되므로 "이 사람이 운영자다"
 * 라고 말할 근거가 없습니다. 그래서 **서버만 아는 열쇠**(`ADMIN_KEY`)를 맞춰봅니다.
 *
 * 연동이 끝나 진짜 계정이 생기면, 여기를 `session.sub` 허용 목록으로 바꾸는 편이
 * 낫습니다. 열쇠 하나를 여러 사람이 나눠 쓰면 누가 지웠는지 남지 않습니다.
 *
 * 환경변수: ADMIN_KEY (서버 전용 — NEXT_PUBLIC_ 금지)
 *   openssl rand -base64 24
 * 값이 없으면 이 경로 전체가 501 이고 관리 화면도 열리지 않습니다.
 */
import type { NextRequest } from "next/server";
import { dbReady } from "@/lib/db/client";
import { deleteReview, listAllReviews, setReviewStatus } from "@/lib/db/reviews";

const fail = (message: string, status: number) =>
  Response.json({ error: message }, { status });

/** 길이가 달라도 일찍 끝나지 않게 — 타이밍으로 열쇠를 추측하지 못하도록 */
function keyMatches(given: string | null): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!expected || !given || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

/** 통과하면 null, 막히면 그대로 돌려줄 응답 */
function guard(request: NextRequest): Response | null {
  if (!process.env.ADMIN_KEY) return fail("관리 기능이 설정되지 않았습니다.", 501);
  if (!dbReady()) return fail("데이터베이스가 설정되지 않았습니다.", 501);
  if (!keyMatches(request.headers.get("x-admin-key"))) return fail("열쇠가 맞지 않습니다.", 401);
  return null;
}

export async function GET(request: NextRequest) {
  const blocked = guard(request);
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
  const blocked = guard(request);
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
  const blocked = guard(request);
  if (blocked) return blocked;

  const parsed = await readId(request);
  if (!parsed) return fail("id 가 필요합니다.", 400);

  const ok = await deleteReview(parsed.id);
  return ok ? Response.json({ ok: true }) : fail("삭제하지 못했습니다.", 500);
}
