"use client";

/**
 * 세션 저장/복원 — login.js §3 이식.
 * 데모 단계라 브라우저 저장소만 사용합니다. 실제 서비스에서는
 * 서버가 발급한 HttpOnly 쿠키로 세션을 관리해야 합니다.
 */
import type { Session } from "@/types/session";

export const SESSION_KEY = "triptalk.session";
export const STATE_KEY = "triptalk.oauth.state";

export function saveSession(session: Session, persist = true) {
  const store = persist ? localStorage : sessionStorage;
  try {
    store.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* 사파리 프라이빗 모드 등 저장 실패는 무시 — 화면 표시는 그대로 진행 */
  }
}

export function readSession(): Session | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw) as Session;
    } catch { /* 손상된 값은 무시 */ }
  }
  return null;
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* 무시 */ }
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* 무시 */ }
}

export function formatTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ko-KR", {
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}
