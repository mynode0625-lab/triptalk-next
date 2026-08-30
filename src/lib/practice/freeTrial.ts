"use client";

/**
 * 로그인 없이 써 볼 수 있는 연습 횟수.
 *
 * 처음 온 사람에게 로그인부터 요구하면 대부분 그 자리에서 돌아갑니다. 그래서
 * 다섯 번은 그냥 열어 두고, 그 다음에 로그인을 안내합니다.
 *
 * ⚠ 한계 — 이 카운터는 브라우저 localStorage 에 있습니다. 개발자 도구로 지우거나
 * 시크릿 창을 열면 다섯 번이 다시 생깁니다. 즉 **비용을 지키는 방어선이 아니라**
 * 로그인을 권하는 안내입니다. 실제 비용은 서버가 세는 `/api/tts` 의 IP·계정
 * 상한이 막고 있습니다.
 *
 * 계정에 묶어 정확히 세야 할 때가 오면(무료 5회를 계정 단위로 거는 유료화 등)
 * 아래 read/write 두 함수만 서버 저장소 호출로 갈아끼우면 됩니다. 화면 쪽은
 * `useFreeTrial()` 만 보고 있어 그대로 둘 수 있습니다.
 *
 * localStorage 는 React 바깥의 저장소이므로 `useStoredTts` 와 같은 방식으로
 * useSyncExternalStore 로 구독합니다. 서버 스냅숏은 0 이라 hydration 이 어긋나지
 * 않습니다.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fetchSession } from "@/lib/auth/session";

/** 비로그인 방문자에게 열어 두는 연습 횟수 */
export const FREE_LIMIT = 5;

export const STORAGE_KEY = "triptalk.free.runs";

let snapshot: number | null = null;
const listeners = new Set<() => void>();

function read(): number {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;                       // 저장소가 막힌 브라우저 — 세지 않고 열어 둡니다
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // 다른 탭에서 연습을 시작했다면 이 탭의 남은 횟수도 같이 줄어야 합니다.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) { snapshot = null; onChange(); }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): number {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

const getServerSnapshot = () => 0;

/** 연습을 한 번 시작했다고 기록합니다. */
function bumpRuns() {
  const next = getSnapshot() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* 저장하지 못해도 연습은 계속됩니다 */
  }
  snapshot = next;
  listeners.forEach(l => l());
}

export type FreeTrial = {
  /** 세션 확인이 끝났는지 — 끝나기 전에는 아무도 막지 않습니다 */
  ready: boolean;
  /** 로그인하지 않은 방문자인지 */
  guest: boolean;
  /** 남은 무료 횟수 (로그인 상태면 의미 없음) */
  left: number;
  /** 무료 횟수를 다 써서 더 시작할 수 없는 상태 */
  locked: boolean;
  /** 연습을 한 번 시작했다고 기록합니다 (로그인 상태면 아무 일도 하지 않음) */
  consume: () => void;
};

export function useFreeTrial(): FreeTrial {
  const used = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [status, setStatus] = useState<"checking" | "guest" | "user">("checking");

  /* consume() 이 렌더마다 새로 만들어지지 않도록 로그인 여부는 ref 로도 둡니다. */
  const guestRef = useRef(true);

  useEffect(() => {
    let alive = true;
    void fetchSession().then(session => {
      if (!alive) return;
      guestRef.current = !session;
      setStatus(session ? "user" : "guest");
    });
    return () => { alive = false; };
  }, []);

  const consume = useCallback(() => {
    if (guestRef.current) bumpRuns();   // 로그인한 사람은 세지 않습니다
  }, []);

  const guest = status !== "user";
  const left = Math.max(0, FREE_LIMIT - used);

  return { ready: status !== "checking", guest, left, locked: status === "guest" && left === 0, consume };
}
