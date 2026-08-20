"use client";

/**
 * 세션 — 서버에 물어봅니다.
 *
 * 예전에는 이 파일이 localStorage 에 세션을 직접 쓰고 읽었습니다. 그러면 개발자
 * 도구로 값을 써넣는 것만으로 로그인 상태를 만들 수 있어서, 로그인이 무언가를
 * 지키기 시작하는 순간 그대로 뚫립니다. 지금은 서버가 서명한 HttpOnly 쿠키가
 * 유일한 근거이고, 브라우저 쪽 코드는 쿠키를 읽지도 쓰지도 못합니다.
 */
import type { Session } from "@/types/session";

/** 로그인 인가 요청의 CSRF 방지용 state 보관 키 (세션 자체와는 별개) */
export const STATE_KEY = "triptalk.oauth.state";

export async function fetchSession(): Promise<Session | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const { session } = (await res.json()) as { session: Session | null };
    return session;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {
    /* 네트워크가 끊겨도 화면은 로그아웃 상태로 되돌립니다 */
  }
}

export function formatTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ko-KR", {
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}
