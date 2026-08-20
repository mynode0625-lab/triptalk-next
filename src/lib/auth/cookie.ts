/**
 * 서버 세션 — HMAC 으로 서명한 HttpOnly 쿠키
 *
 * 이전에는 로그인 결과를 브라우저 localStorage 에 두었습니다. 그러면 개발자 도구로
 * 값을 써넣기만 해도 "로그인된" 상태를 만들 수 있어서, 로그인이 무언가를 지켜주는
 * 순간 그대로 뚫립니다. 세션은 서버가 발급하고 서버가 검증해야 합니다.
 *
 * 쿠키는 `httpOnly` 라 자바스크립트가 읽지 못하고, 서명이 맞지 않으면 서버가 버립니다.
 * 값 자체는 암호화가 아니라 서명입니다 — 이름·이메일은 들여다볼 수 있지만
 * **고칠 수는 없습니다.** 비밀로 지켜야 할 것은 담지 않습니다.
 *
 * 환경변수: AUTH_SECRET (서버 전용, 32자 이상 권장)
 *   openssl rand -base64 32
 */
import "server-only";
import { cookies } from "next/headers";
import type { Session } from "@/types/session";

export const SESSION_COOKIE = "triptalk_session";

/** 로그인 유지 기간 — 7일 */
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

/**
 * AUTH_SECRET 이 없으면 인스턴스마다 임의의 값을 씁니다.
 * 로컬 개발은 이걸로 충분하지만, 배포본에서는 인스턴스가 바뀔 때마다 로그인이
 * 풀리므로 반드시 환경변수를 넣어야 합니다. (`hasStableSecret()` 로 확인)
 */
const FALLBACK_SECRET = crypto.randomUUID() + crypto.randomUUID();

export const hasStableSecret = (): boolean => Boolean(process.env.AUTH_SECRET);

function secret(): string {
  return process.env.AUTH_SECRET || FALLBACK_SECRET;
}

/* ── base64url ────────────────────────────────────────────── */
const toB64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function fromB64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(text.length + ((4 - (text.length % 4)) % 4), "=");
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toB64Url(new Uint8Array(sig));
}

/** 길이가 달라도 일찍 끝나지 않게 — 타이밍으로 서명을 추측하지 못하도록 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type Payload = Session & { exp: number };

/* ── 발급 · 검증 ──────────────────────────────────────────── */

export async function issueSession(session: Session): Promise<void> {
  const payload: Payload = { ...session, exp: Date.now() + MAX_AGE_SEC * 1000 };
  const body = toB64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const token = `${body}.${await hmac(body)}`;

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // 로컬은 http 라서 Secure 를 켜면 쿠키가 아예 저장되지 않습니다.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",   // OAuth 제공자에서 되돌아오는 이동(top-level GET)에도 쿠키가 붙습니다
    path: "/",
    maxAge: MAX_AGE_SEC
  });
}

export async function readSessionCookie(): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;

  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!timingSafeEqual(sig, await hmac(body))) return null;   // 위조되었거나 시크릿이 바뀜

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(body))) as Payload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    return {
      provider: payload.provider,
      name: payload.name,
      email: payload.email,
      avatar: payload.avatar,
      loginAt: payload.loginAt,
      demo: payload.demo
    };
  } catch {
    return null;
  }
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
