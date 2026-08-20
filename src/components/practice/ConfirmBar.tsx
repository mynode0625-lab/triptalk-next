"use client";

import { useEffect, useRef } from "react";

export type ConfirmState = {
  /** 인식된 원문 (수정 전) */
  original: string;
  text: string;
  confidence: number;
  alts: string[];
};

type Props = {
  state: ConfirmState;
  onChange: (text: string) => void;
  onSend: () => void;
  onRetry: () => void;
};

export function ConfirmBar({ state, onChange, onSend, onRetry }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  /* 확인 창이 열릴 때(=원문이 바뀔 때) 커서를 끝으로 두고 포커스 */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const n = el.value.length;
    el.setSelectionRange(n, n);
  }, [state.original]);

  const uniq = [
    ...new Set(
      state.alts
        .map(a => a.trim())
        .filter(a => a && a.toLowerCase() !== state.original.toLowerCase())
    )
  ].slice(0, 3);

  return (
    <div className="confirm" id="confirm">
      <div className="confirm__head">
        🎧 <b>이렇게 들렸어요.</b> 다르게 말했다면 직접 고쳐주세요 —
        <span>고친 단어는 발음 연습 목록에 담깁니다.</span>
      </div>
      <div className="confirm__row">
        <input
          type="text" id="confirmInput" autoComplete="off" spellCheck={false}
          ref={inputRef}
          value={state.text}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSend(); }}
        />
        <button className="btn btn--primary" id="confirmSend" onClick={onSend}>
          이대로 보내기
        </button>
      </div>
      <div className="confirm__alts" id="confirmAlts">
        {uniq.length ? (
          <>
            <span style={{ fontSize: "12.5px", color: "#a16207", alignSelf: "center" }}>
              혹시 이거였나요?
            </span>
            {uniq.map(a => (
              <button className="alt-chip" key={a} onClick={() => onChange(a)}>{a}</button>
            ))}
          </>
        ) : null}
      </div>
      <div className="confirm__foot">
        <button className="link-btn" id="confirmRetry" onClick={onRetry}>🎙 다시 말하기</button>
        <span className="confirm__conf" id="confirmConf">
          {state.confidence ? `인식 신뢰도 ${Math.round(state.confidence * 100)}%` : ""}
        </span>
      </div>
    </div>
  );
}
