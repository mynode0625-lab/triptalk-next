"use client";

import { useSyncExternalStore } from "react";

/** 브라우저 기능 판정은 변하지 않으므로 구독은 비어 있습니다. */
const noSubscribe = () => () => {};
const nullSnapshot = () => null;

const getSpeechSupported = () =>
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

const getSecureContext = () =>
  window.isSecureContext ||
  location.protocol === "https:" ||
  ["localhost", "127.0.0.1"].includes(location.hostname);

/** 음성 인식 지원 여부. 판정 전(SSR·hydration 중)에는 null. */
export function useSpeechSupported(): boolean | null {
  return useSyncExternalStore<boolean | null>(noSubscribe, getSpeechSupported, nullSnapshot);
}

/** 보안 컨텍스트(마이크 사용 가능) 여부. 판정 전에는 null. */
export function useSecureContext(): boolean | null {
  return useSyncExternalStore<boolean | null>(noSubscribe, getSecureContext, nullSnapshot);
}
