import "server-only";
import { cookies } from "next/headers";

/**
 * 관리자 세션 — 서명된 HttpOnly 쿠키
 *
 * 관리자는 **한 사람**입니다. 계정을 데이터베이스에 두지 않고 서버 설정으로 둡니다.
 * 운영자가 한 명이면 회원 테이블·비밀번호 재설정·초대 흐름이 전부 없어도 됩니다.
 *
 * 왜 로그인 세션을 계정(`Session`)으로 가리지 않는가 — 지금 로그인은 신한 SOL
 * 연동 키가 없어 데모로 돌고, 데모 세션은 방문자마다 임시로 발급되며 이메일은
 * 모두 같은 값입니다. "이 계정만 관리자" 라고 걸면 데모로 들어온 누구나 통과합니다.
 * 연동이 끝나 진짜 계정이 생기면 그때 `session.sub` 허용 목록으로 바꾸는 편이
 * 낫습니다 — 누가 지웠는지가 남기 때문입니다.
 *
 * 환경변수 (서버 전용 — NEXT_PUBLIC_ 금지)
 *   ADMIN_ID        관리자 아이디
 *   ADMIN_PASSWORD  관리자 비밀번호
 *   AUTH_SECRET     쿠키 서명 (로그인 세션과 같은 값을 씁니다)
 * 둘 중 하나라도 없으면 관리 기능 전체가 꺼집니다.
 */

export const ADMIN_COOKIE = "triptalk_admin";

/** 관리 세션 유지 시간 — 짧게 둡니다. 열어둔 채 자리를 비우는 화면입니다. */
const MAX_AGE_SEC = 60 * 60 * 2;

export const adminConfigured = (): boolean =>
  Boolean(process.env.ADMIN_ID && process.env.ADMIN_PASSWORD);

const toB64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function fromB64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(text.length + ((4 - (text.length % 4)) % 4), "=");
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

const FALLBACK_SECRET = crypto.randomUUID() + crypto.randomUUID();

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(process.env.AUTH_SECRET || FALLBACK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toB64Url(new Uint8Array(sig));
}

/** 길이가 달라도 일찍 끝나지 않게 — 타이밍으로 값을 추측하지 못하도록 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 아이디와 비밀번호가 **둘 다** 맞아야 합니다. */
export function credentialsMatch(id: string, password: string): boolean {
  const expectedId = process.env.ADMIN_ID;
  const expectedPw = process.env.ADMIN_PASSWORD;
  if (!expectedId || !expectedPw) return false;
  // 둘 다 비교합니다 — 앞에서 끊으면 아이디가 맞는지 여부가 응답 시간에 드러납니다.
  const okId = timingSafeEqual(expectedId, id);
  const okPw = timingSafeEqual(expectedPw, password);
  return okId && okPw;
}

type Payload = { id: string; exp: number };

export async function issueAdminSession(id: string): Promise<void> {
  const body = toB64Url(
    new TextEncoder().encode(JSON.stringify({ id, exp: Date.now() + MAX_AGE_SEC * 1000 }))
  );
  (await cookies()).set(ADMIN_COOKIE, `${body}.${await sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",          // 관리 화면은 다른 사이트에서 넘어올 일이 없습니다
    path: "/",
    maxAge: MAX_AGE_SEC
  });
}

/** 관리자로 로그인한 상태인지. 아니면 null. */
export async function readAdminSession(): Promise<string | null> {
  if (!adminConfigured()) return null;

  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;

  const body = raw.slice(0, dot);
  if (!timingSafeEqual(raw.slice(dot + 1), await sign(body))) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(body))) as Payload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    // 설정된 아이디가 바뀌었다면 예전 쿠키는 더 이상 관리자가 아닙니다.
    if (payload.id !== process.env.ADMIN_ID) return null;
    return payload.id;
  } catch {
    return null;
  }
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
