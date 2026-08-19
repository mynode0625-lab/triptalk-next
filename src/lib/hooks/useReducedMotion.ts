"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;

/** 서버에서는 알 수 없으므로 null — hydration 이후 실제 값으로 바뀝니다. */
const getServerSnapshot = () => null;

/** `prefers-reduced-motion: reduce` 여부. 판정 전에는 null. */
export function useReducedMotion(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribe, getSnapshot, getServerSnapshot);
}
