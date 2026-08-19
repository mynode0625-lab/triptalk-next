"use client";

/**
 * 음성 설정 영속화 (`localStorage: triptalk_tts`) — practice.js §6 이식.
 *
 * localStorage 는 React 바깥의 외부 저장소이므로 useSyncExternalStore 로
 * 구독합니다. 서버 스냅숏은 기본값이라 hydration 불일치가 없습니다.
 */
import { useSyncExternalStore } from "react";
import type { TtsOptions } from "@/types/practice";

export const STORAGE_KEY = "triptalk_tts";

export type StoredTts = { voiceURI: string; tts: TtsOptions };

const DEFAULT: StoredTts = Object.freeze({
  voiceURI: "",
  tts: Object.freeze({ provider: "", key: "", voice: "" }) as TtsOptions
});

let snapshot: StoredTts | null = null;
const listeners = new Set<() => void>();

function read(): StoredTts {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as
      Partial<TtsOptions> & { voiceURI?: string };
    return {
      voiceURI: saved.voiceURI || "",
      tts: saved.provider
        ? { provider: saved.provider, key: saved.key || "", voice: saved.voice || "" }
        : { provider: "", key: "", voice: "" }
    };
  } catch {
    return DEFAULT;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) { snapshot = null; onChange(); }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** 같은 값이면 같은 참조를 돌려줘야 무한 렌더를 피할 수 있습니다. */
function getSnapshot(): StoredTts {
  if (!snapshot) snapshot = read();
  return snapshot;
}

const getServerSnapshot = (): StoredTts => DEFAULT;

/** 저장하고 구독자에게 알립니다. */
export function writeStoredTts(next: StoredTts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next.tts, voiceURI: next.voiceURI }));
  } catch { /* 사파리 프라이빗 모드 등은 무시 */ }
  snapshot = next;
  listeners.forEach(l => l());
}

export function useStoredTts(): StoredTts {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
