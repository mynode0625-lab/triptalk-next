"use client";

/**
 * 무료 이용 범위.
 *
 * 두 종류의 방문자가 있습니다.
 *
 *   · 그냥 들어온 사람      — 연습 **3회**. 로그인부터 요구하면 대부분 그 자리에서
 *                             돌아가므로 몇 번은 열어 두고 그 다음에 안내합니다.
 *   · 슈퍼SOL 환전 고객     — **여행 날짜까지 하루 5회.** 환전에 딸려 오는 무료
 *                             서비스이므로 총량이 아니라 기간으로 줍니다.
 *
 * 왜 무기한이 아니라 여행 날짜까지인가 — 환전에서 비롯된 자격이니 그 여행이 끝나면
 * 근거도 끝납니다. 다음 여행의 환전 때 다시 만나는 편이 서로에게 맞습니다.
 *
 * 왜 무제한이 아니라 하루 5회인가 — 사업 분석에서 하루 5회가 마진을 지키는 선이었고,
 * 지금은 그 비용을 제휴사가 부담하는 구조라 무제한을 약속할 자리가 아닙니다.
 * 한 시나리오가 5턴이라 하루 5회면 정상적인 학습에는 남습니다.
 *
 * 들어오는 주소: `/practice?from=supersol&until=2026-09-15`
 *   from  — 환전 고객 표식
 *   until — 여행(출국) 예정일. 없으면 날짜 제한 없이 하루 5회로 둡니다.
 *
 * ⚠ 한계 — 카운터도 표식도 날짜도 브라우저에 있습니다. 주소창에 직접 쳐 넣거나
 * 시크릿 창을 열면 그만입니다. 즉 **비용을 지키는 방어선이 아니라** 안내입니다.
 * 실제 비용은 서버가 세는 `/api/tts` 의 IP·계정 상한과 OpenAI 예산 상한이 막습니다.
 * 실제 연동 때는 슈퍼SOL 이 서명한 토큰을 받아 서버에서 확인하는 방식으로 올려야
 * 합니다 — `supabase-plan.md` 3장 참고.
 *
 * localStorage 는 React 바깥의 저장소이므로 useSyncExternalStore 로 구독합니다.
 * 서버 스냅숏은 "아직 아무것도 모른다"에 해당하는 값이라 hydration 이 어긋나지 않습니다.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { fetchSession } from "@/lib/auth/session";

/** 환전하지 않고 들어온 방문자에게 열어 두는 총 횟수 */
export const FREE_LIMIT = 3;

/** 환전 고객에게 여행 날짜까지 매일 열어 두는 횟수 */
export const PARTNER_DAILY_LIMIT = 5;

/** 슈퍼SOL 환전 완료 화면이 붙여 보내는 값 */
export const PARTNER_PARAM = "from";
export const PARTNER_VALUE = "supersol";
export const UNTIL_PARAM = "until";

export const STORAGE_KEY = "triptalk.free.runs";
export const PARTNER_STORAGE_KEY = "triptalk.partner";

/** 오늘 날짜 — 서버가 아니라 사용자의 달력을 기준으로 셉니다. */
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** 저장해 두는 환전 고객 상태 */
type PartnerState = {
  /** 여행 예정일 (YYYY-MM-DD). 없으면 날짜 제한 없음 */
  until: string | null;
  /** 마지막으로 센 날 */
  day: string;
  /** 그날 사용한 횟수 */
  used: number;
};

let runsSnapshot: number | null = null;
let partnerSnapshot: PartnerState | null | undefined;   // undefined = 아직 안 읽음
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

function readPartner(): PartnerState | null {
  try {
    const raw = localStorage.getItem(PARTNER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PartnerState>;
    return {
      until: isDate(parsed.until ?? null) ? (parsed.until as string) : null,
      day: typeof parsed.day === "string" ? parsed.day : "",
      used: typeof parsed.used === "number" && parsed.used > 0 ? Math.floor(parsed.used) : 0
    };
  } catch {
    return null;                    // 예전 형식이거나 손상됨 — 환전 고객이 아닌 것으로 둡니다
  }
}

function writePartner(next: PartnerState) {
  try {
    localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* 저장하지 못해도 이번 방문 동안은 아래 스냅숏으로 유지됩니다 */
  }
  partnerSnapshot = next;
  notify();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // 다른 탭에서 연습을 시작했다면 이 탭의 남은 횟수도 같이 줄어야 합니다.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) { runsSnapshot = null; onChange(); }
    if (e.key === PARTNER_STORAGE_KEY) { partnerSnapshot = undefined; onChange(); }
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

function getPartner(): PartnerState | null {
  if (partnerSnapshot === undefined) partnerSnapshot = readPartner();
  return partnerSnapshot;
}

const serverRuns = () => 0;
const serverPartner = (): PartnerState | null => null;

/** 여행이 끝났는지 — `until` 이 없으면 끝나지 않습니다. */
const expired = (p: PartnerState): boolean => Boolean(p.until && today() > p.until);

/** 오늘 몇 번 썼는지 — 날이 바뀌었으면 0 부터 다시 셉니다. */
const usedToday = (p: PartnerState): number => (p.day === today() ? p.used : 0);

/** 환전 고객으로 표시합니다. 이미 표시돼 있으면 여행 날짜만 갱신합니다. */
function markPartner(until: string | null) {
  const prev = getPartner();
  if (prev && prev.until === until) return;
  writePartner({
    until: until ?? prev?.until ?? null,
    day: prev?.day ?? "",
    used: prev?.used ?? 0
  });
}

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

function bumpPartnerDay(p: PartnerState) {
  writePartner({ until: p.until, day: today(), used: usedToday(p) + 1 });
}

/** 더 시작할 수 없는 이유 — 화면이 다른 말을 해야 하므로 구분합니다. */
export type LockReason = "free-exhausted" | "daily-exhausted";

export type FreeTrial = {
  /** 세션 확인이 끝났는지 — 끝나기 전에는 아무도 막지 않습니다 */
  ready: boolean;
  /** 로그인하지 않은 방문자인지 */
  guest: boolean;
  /** 여행 날짜가 지나지 않은 슈퍼SOL 환전 고객인지 */
  partner: boolean;
  /** 환전 고객의 여행 예정일 (YYYY-MM-DD). 날짜 없이 들어왔으면 null */
  until: string | null;
  /** 남은 횟수 — 환전 고객은 오늘 남은 수, 그 밖에는 전체 남은 수 */
  left: number;
  /** 더 시작할 수 없는 상태 */
  locked: boolean;
  /** 막힌 이유 */
  reason: LockReason | null;
  /** 연습을 한 번 시작했다고 기록합니다 (로그인 사용자에겐 아무 일도 하지 않음) */
  consume: () => void;
};

export function useFreeTrial(): FreeTrial {
  const used = useSyncExternalStore(subscribe, getRuns, serverRuns);
  const partnerState = useSyncExternalStore(subscribe, getPartner, serverPartner);
  const [status, setStatus] = useState<"checking" | "guest" | "user">("checking");

  /* consume() 이 렌더마다 새로 만들어지지 않도록 로그인 여부는 ref 로도 둡니다.
     환전 상태는 React 바깥의 저장소에 있으니 그때그때 읽으면 됩니다. */
  const guestRef = useRef(true);

  /* 환전 완료 화면에서 넘어왔다면 이 방문자를 제휴 고객으로 기억합니다. */
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get(PARTNER_PARAM) !== PARTNER_VALUE) return;
    const raw = searchParams.get(UNTIL_PARAM);
    markPartner(isDate(raw) ? raw : null);
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
    if (!guestRef.current) return;                  // 로그인한 사람은 세지 않습니다
    const p = getPartner();
    if (p && !expired(p)) bumpPartnerDay(p);        // 환전 고객은 그날치를 셉니다
    else bumpRuns();
  }, []);

  const guest = status !== "user";
  const partnerActive = Boolean(partnerState && !expired(partnerState));

  const left = partnerActive
    ? Math.max(0, PARTNER_DAILY_LIMIT - usedToday(partnerState as PartnerState))
    : Math.max(0, FREE_LIMIT - used);

  const locked = status === "guest" && left === 0;

  return {
    ready: status !== "checking",
    guest,
    partner: partnerActive,
    until: partnerActive ? (partnerState as PartnerState).until : null,
    left,
    locked,
    reason: locked ? (partnerActive ? "daily-exhausted" : "free-exhausted") : null,
    consume
  };
}
