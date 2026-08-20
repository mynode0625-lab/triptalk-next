"use client";

/** 입력 레벨 미터 — practice.js §5 이식 */
import { useCallback, useEffect, useRef, useState } from "react";

export const METER_BARS = 7;
const IDLE = Array<number>(METER_BARS).fill(6);

export function useMicLevel() {
  const [levels, setLevels] = useState<number[]>(IDLE);
  const [live, setLive] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);

  const start = useCallback(async () => {
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      if (!ctxRef.current) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctor();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(streamRef.current).connect(analyser);
        ctxRef.current = ctx;
        analyserRef.current = analyser;
      }
      if (ctxRef.current.state === "suspended") await ctxRef.current.resume();

      setLive(true);
      const analyser = analyserRef.current!;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteFrequencyData(data);
        const next: number[] = [];
        for (let i = 0; i < METER_BARS; i++) {
          const v = data[3 + i * 4] || 0;
          next.push(Math.max(6, Math.min(30, v / 8)));
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      /* 마이크 미허용 — 미터 없이 진행 */
    }
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setLive(false);
    setLevels(IDLE);
  }, []);

  /* 언마운트 시 마이크 트랙과 AudioContext 를 확실히 해제합니다. */
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => { /* 이미 닫힘 */ });
    ctxRef.current = null;
    analyserRef.current = null;
  }, []);

  return { levels, live, start, stop };
}
