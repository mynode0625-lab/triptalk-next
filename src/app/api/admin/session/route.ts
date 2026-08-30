/**
 * 관리자 로그인 · 로그아웃 · 상태 확인
 *
 * 관리자는 서버 설정에 있는 **한 계정**뿐입니다 (`lib/auth/adminSession.ts`).
 * 맞으면 서명된 HttpOnly 쿠키를 발급하고, 이후 관리 API 는 그 쿠키만 봅니다.
 * 비밀번호가 매 요청에 실려 다니지 않게 하려는 것입니다.
 */
import type { NextRequest } from "next/server";
import {
  adminConfigured, clearAdminSession, credentialsMatch, issueAdminSession, readAdminSession
} from "@/lib/auth/adminSession";

const fail = (message: string, status: number) =>
  Response.json({ error: message }, { status });

export async function GET() {
  return Response.json(
    { configured: adminConfigured(), signedIn: Boolean(await readAdminSession()) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

type Body = { id?: unknown; password?: unknown };

export async function POST(request: NextRequest) {
  if (!adminConfigured()) return fail("관리 계정이 설정되지 않았습니다.", 501);

  let payload: Body;
  try { payload = (await request.json()) as Body; }
  catch { return fail("잘못된 요청 본문입니다.", 400); }

  const id = typeof payload.id === "string" ? payload.id : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!credentialsMatch(id, password)) {
    // 아이디가 틀렸는지 비밀번호가 틀렸는지 알려주지 않습니다.
    return fail("아이디 또는 비밀번호가 맞지 않습니다.", 401);
  }

  await issueAdminSession(id);
  return Response.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSession();
  return Response.json({ ok: true });
}
