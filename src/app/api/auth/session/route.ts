/**
 * 현재 세션 조회 · 로그아웃
 *
 * 로그인 여부는 이제 브라우저 저장소가 아니라 **서버가 서명한 쿠키**로 정합니다.
 * 클라이언트는 이 엔드포인트에 물어보는 것 말고는 세션을 알 방법이 없고,
 * 개발자 도구로 값을 고쳐 넣어도 서명이 맞지 않아 통과하지 못합니다.
 *
 * 경로 주의 — `session` 은 정적 세그먼트라 `[provider]` 보다 먼저 잡힙니다.
 * (`isProvider()` 가 어차피 걸러내므로 동작상 겹치는 부분은 없습니다.)
 */
import { clearSessionCookie, readSessionCookie } from "@/lib/auth/cookie";

export async function GET() {
  const session = await readSessionCookie();
  return Response.json(
    { session },
    // 세션 응답은 절대 캐시하지 않습니다.
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
