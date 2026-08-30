/**
 * 관리자 로그인 · 로그아웃 · 상태 확인
 *
 * 관리자는 서버 설정에 있는 **한 계정**뿐입니다 (`lib/auth/adminSession.ts`).
 * 맞으면 서명된 HttpOnly 쿠키를 발급하고, 이후 관리 API 는 그 쿠키만 봅니다.
 * 비밀번호가 매 요청에 실려 다니지 않게 하려는 것입니다.
 *
 * 비밀번호 하나로 지키는 문이므로 **틀린 시도를 세어 막습니다.** 그러지 않으면
 * 시간만 들이면 언젠가 맞습니다. 성공하면 세던 것을 지웁니다.
 *
 * ⚠ 세는 곳이 서버 인스턴스 메모리라 인스턴스마다 따로 셉니다 — `/api/tts` 와 같은
 * 한계입니다. 시도를 완전히 막지는 못하고 속도를 크게 늦춥니다. 정확한 전역 제한이
 * 필요해지면 공유 저장소로 옮기세요 (`supabase-plan.md` 5.3 과 같은 방식).
 */
import type { NextRequest } from "next/server";
import {
  adminConfigured, clearAdminSession, credentialsMatch, issueAdminSession, readAdminSession
} from "@/lib/auth/adminSession";

const fail = (message: string, status: number, headers?: HeadersInit) =>
  Response.json({ error: message }, { status, headers });

/** 한 IP 가 이 시간 안에 틀릴 수 있는 횟수 */
const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000;

type Attempts = { count: number; until: number };
const failures = new Map<string, Attempts>();

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** 잠겨 있으면 남은 초, 아니면 0 */
function lockedFor(ip: string, now: number): number {
  const entry = failures.get(ip);
  if (!entry || now >= entry.until) return 0;
  return entry.count >= MAX_FAILURES ? Math.ceil((entry.until - now) / 1000) : 0;
}

function noteFailure(ip: string, now: number) {
  const entry = failures.get(ip);
  if (!entry || now >= entry.until) {
    failures.set(ip, { count: 1, until: now + WINDOW_MS });
    // 오래된 항목을 걷어내 Map 이 무한히 커지지 않게 합니다.
    if (failures.size > 500) for (const [k, v] of failures) if (now >= v.until) failures.delete(k);
    return;
  }
  entry.count += 1;
  entry.until = now + WINDOW_MS;   // 계속 틀리면 잠금이 이어집니다
}

export async function GET() {
  return Response.json(
    { configured: adminConfigured(), signedIn: Boolean(await readAdminSession()) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

type Body = { id?: unknown; password?: unknown };

export async function POST(request: NextRequest) {
  if (!adminConfigured()) return fail("관리 계정이 설정되지 않았습니다.", 501);

  const now = Date.now();
  const ip = clientIp(request);
  const wait = lockedFor(ip, now);
  if (wait) {
    return fail(
      `로그인 시도가 너무 많습니다. ${Math.ceil(wait / 60)}분 뒤에 다시 시도해 주세요.`,
      429,
      { "Retry-After": String(wait) }
    );
  }

  let payload: Body;
  try { payload = (await request.json()) as Body; }
  catch { return fail("잘못된 요청 본문입니다.", 400); }

  const id = typeof payload.id === "string" ? payload.id : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!credentialsMatch(id, password)) {
    noteFailure(ip, now);
    // 아이디가 틀렸는지 비밀번호가 틀렸는지 알려주지 않습니다.
    return fail("아이디 또는 비밀번호가 맞지 않습니다.", 401);
  }

  failures.delete(ip);             // 맞았으니 세던 것을 지웁니다
  await issueAdminSession(id);
  return Response.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSession();
  return Response.json({ ok: true });
}
