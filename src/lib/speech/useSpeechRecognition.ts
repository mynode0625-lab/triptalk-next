"use client";

/** STT — practice.js §10 이식 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSecureContext, useSpeechSupported } from "@/lib/hooks/useEnvSupport";

export type RecognitionResult = {
  text: string;
  confidence: number;
  alts: string[];
};

export type RecognitionHandlers = {
  onStart?: () => void;
  /** 확정 + 중간 결과를 이어붙인 문자열 */
  onInterim?: (text: string) => void;
  onError?: (code: string) => void;
  /** 인식 종료. text 가 비어 있으면 아무 말도 잡히지 않은 것입니다. */
  onDone?: (r: RecognitionResult) => void;
};

export const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "마이크 권한이 거부됐습니다. 주소창의 자물쇠 아이콘에서 마이크를 허용해 주세요.",
  "service-not-allowed": "브라우저가 마이크 사용을 막았습니다. 권한을 확인해 주세요.",
  "no-speech": "소리가 들리지 않았습니다. 다시 한 번 말해보세요.",
  "audio-capture": "마이크를 찾을 수 없습니다. 입력 장치를 확인해 주세요.",
  "network": "음성 인식 서버에 연결하지 못했습니다. 네트워크를 확인해 주세요."
};

export function useSpeechRecognition() {
  /** null = 아직 판정 전. false 로 시작하면 hydration 불일치가 납니다. */
  const supported = useSpeechSupported();
  const secure = useSecureContext();
  const [listening, setListening] = useState(false);

  const recogRef = useRef<SpeechRecognition | null>(null);

  const stop = useCallback(() => {
    const r = recogRef.current;
    if (r) { try { r.stop(); } catch { /* 이미 멈춘 경우 무시 */ } }
  }, []);

  const start = useCallback((lang: string, h: RecognitionHandlers) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recog = new SR();
    recogRef.current = recog;
    recog.lang = lang;
    recog.interimResults = true;
    recog.continuous = false;
    recog.maxAlternatives = 3;

    let finalText = "", confidence = 0, alts: string[] = [];

    recog.onstart = () => { setListening(true); h.onStart?.(); };

    recog.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript;
          confidence = r[0].confidence || 0;
          alts = [];
          for (let k = 0; k < r.length; k++) alts.push(r[k].transcript);
        } else interim += r[0].transcript;
      }
      h.onInterim?.(finalText + interim);
    };

    recog.onerror = (ev) => {
      setListening(false);
      h.onError?.(ev.error);
    };

    recog.onend = () => {
      setListening(false);
      if (recogRef.current === recog) recogRef.current = null;
      h.onDone?.({ text: finalText.trim(), confidence, alts });
    };

    try { recog.start(); }
    catch { /* 이미 시작된 경우 무시 */ }
  }, []);

  /* 언마운트 시 인식기 정리 — 마이크가 켜진 채로 남지 않도록 */
  useEffect(() => () => {
    const r = recogRef.current;
    if (r) {
      r.onstart = r.onresult = r.onerror = r.onend = null;
      try { r.abort(); } catch { /* 무시 */ }
      recogRef.current = null;
    }
  }, []);

  return { supported, secure, listening, start, stop };
}
