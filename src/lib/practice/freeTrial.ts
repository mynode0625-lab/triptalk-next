"use client";

/**
 * 로그인 없이 써 볼 수 있는 연습 횟수.
 *
 * 처음 온 사람에게 로그인부터 요구하면 대부분 그 자리에서 돌아갑니다. 그래서
 * 몇 번은 그냥 열어 두고, 그 다음에 로그인을 안내합니다.
 *
 * 다만 **슈퍼SOL 에서 환전하고 넘어온 고객은 세지 않습니다.** 그 사람들에게
 * TripTalk 은 환전에 딸려 오는 무료 서비스이므로, 횟수를 세는 것 자체가
 * 약속과 어긋납니다. 환전 완료 화면에서 `?from=supersol` 을 달고 들어옵니다.
 *
 * ⚠ 한계 — 이 카운터도, 제휴 표식도 브라우저에 있습니다. 주소창에 직접
 * `?from=supersol` 을 쳐 넣거나 개발자 도구로 저장소를 지우면 그만입니다. 즉
 * **비용을 지키는 방어선이 아니라** 안내입니다. 실제 비용은 서버가 세는
 * `/api/tts` 의 IP·계정 상한이 막고 있습니다. 실제 연동 때는 슈퍼SOL 이
 * 서명한 토큰을 받아 서버에서 확인하는 방식으로 올려야 합니다.
 *
 * 계정에 묶어 정확히 세야 할 때가 오면 아래 read/write 함수만 서버 저장소
 * 호출로 갈아끼우면 됩니다. 화면 쪽은 `useFreeTrial()` 만 보고 있어 그대로
 * 둘 수 있습니다.
 *
 * localStorage 는 React 바깥의 저장소이므로 `useStoredTts` 와 같은 방식으로
 * useSyncExternalStore 로 구독합니다. 서버 스냅숏은 "아직 아무것도 모른다"에
 * 해당하는 값이라 hydration 이 어긋나지 않습니다.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { fetchSession } from "@/lib/auth/session";

/** 환전하지 않고 그냥 들어온 방문자에게 열어 두는 연습 횟수 */
export const FREE_LIMIT = 3;

/** 슈퍼SOL 환전 완료 화면에서 붙여 보내는 표식 — `/practice?from=supersol` */
export const PARTNER_PARAM = "from";
export const PARTNER_VALUE = "supersol";

export const STORAGE_KEY = "triptalk.free.runs";
export const PARTNER_STORAGE_KEY = "triptalk.partner";

let runsSnapshot: number | null = null;
let partnerSnapshot: boolean | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(l => l());

function readRuns(): number {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;                       // 저장소가 막힌 브라우저 — 세지 않고 열어 둡니다
  }
}

function readPartner(): boolean {
  try {
    return localStorage.getItem(PARTNER_STORAGE_KEY) === PARTNER_VALUE;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // 다른 탭에서 연습을 시작했다면 이 탭의 남은 횟수도 같이 줄어야 합니다.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) { runsSnapshot = null; onChange(); }
    if (e.key === PARTNER_STORAGE_KEY) { partnerSnapshot = null; onChange(); }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getRuns(): number {
  if (runsSnapshot === null) runsSnapshot = readRuns();
  return runsSnapshot;
}

function getPartner(): boolean {
  if (partnerSnapshot === null) partnerSnapshot = readPartner();
  return partnerSnapshot;
}

const serverRuns = () => 0;
const serverPartner = () => false;

/** 연습을 한 번 시작했다고 기록합니다. */
function bumpRuns() {
  const next = getRuns() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* 저장하지 못해도 연습은 계속됩니다 */
  }
  runsSnapshot = next;
  notify();
}

/**
 * 환전 고객으로 표시합니다.
 *
 * 한 번 표시해 두면 주소의 표식이 없어져도 유지됩니다. 연습실 안을 돌아다니거나
 * 나중에 다시 들어왔을 때 갑자기 횟수를 세기 시작하면 약속을 어기는 셈입니다.
 */
function markPartner() {
  if (getPartner()) return;
  try {
    localStorage.setItem(PARTNER_STORAGE_KEY, PARTNER_VALUE);
  } catch {
    /* 저장하지 못해도 이번 방문 동안은 아래 스냅숏으로 유지됩니다 */
  }
  partnerSnapshot = true;
  notify();
}

export type FreeTrial = {
  /** 세션·제휴 확인이 끝났는지 — 끝나기 전에는 아무도 막지 않습니다 */
  ready: boolean;
  /** 로그인하지 않은 방문자인지 */
  guest: boolean;
  /** 슈퍼SOL 환전 고객인지 — 맞으면 횟수를 세지 않습니다 */
  partner: boolean;
  /** 남은 무료 횟수 (로그인했거나 환전 고객이면 의미 없음) */
  left: number;
  /** 무료 횟수를 다 써서 더 시작할 수 없는 상태 */
  locked: boolean;
  /** 연습을 한 번 시작했다고 기록합니다 (제한이 없는 사람에겐 아무 일도 하지 않음) */
  consume: () => void;
};

export function useFreeTrial(): FreeTrial {
  const used = useSyncExternalStore(subscribe, getRuns, serverRuns);
  const partner = useSyncExternalStore(subscribe, getPartner, serverPartner);
  const [status, setStatus] = useState<"checking" | "guest" | "user">("checking");

  /* consume() 이 렌더마다 새로 만들어지지 않도록 로그인 여부는 ref 로도 둡니다.
     제휴 여부는 React 바깥의 저장소에 있으니 그때그때 읽으면 됩니다. */
  const guestRef = useRef(true);

  /* 환전 완료 화면에서 넘어왔다면 이 방문자를 제휴 고객으로 기억합니다. */
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get(PARTNER_PARAM) === PARTNER_VALUE) markPartner();
  }, [searchParams]);

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
    if (guestRef.current && !getPartner()) bumpRuns();
  }, []);

  const guest = status !== "user";
  const left = Math.max(0, FREE_LIMIT - used);

  return {
    ready: status !== "checking",
    guest,
    partner,
    left,
    locked: status === "guest" && !partner && left === 0,
    consume
  };
}
