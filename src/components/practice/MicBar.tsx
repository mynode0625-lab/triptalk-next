"use client";

import { useEffect, useRef, useState } from "react";
import { METER_BARS } from "@/lib/speech/useMicLevel";

export type MicLive =
  | { kind: "hint" }
  | { kind: "interim"; text: string }
  | { kind: "error"; msg: string }
  | { kind: "target"; text: string };

type Props = {
  live: MicLive;
  listening: boolean;
  enabled: boolean;
  /** 'answer' | 'shadow' */
  mode: "answer" | "shadow";
  canListen: boolean;
  levels: number[];
  meterLive: boolean;
  typeBarOpen: boolean;
  onMic: () => void;
  onToggleType: () => void;
  onType: (text: string) => void;
  micBtnRef: React.RefObject<HTMLButtonElement | null>;
};

function liveText(live: MicLive, mode: Props["mode"], canListen: boolean) {
  switch (live.kind) {
    case "interim":
      return <span className="interim">{live.text}</span>;
    case "error":
      return (
        <span className="micbar__hint">
          ⚠️ {live.msg} 타이핑으로도 답할 수 있습니다.
        </span>
      );
    case "target":
      return (
        <span className="micbar__hint">
          🎯 목표 문장: <b>“{live.text}”</b> — 마이크를 누르고 그대로 읽어보세요
        </span>
      );
    default:
      return (
        <span className="micbar__hint">
          {mode === "shadow"
            ? "🎯 따라 말하기 — 모범 문장을 그대로 읽어보세요"
            : canListen
              ? "마이크를 누르고 영어로 답해보세요"
              : "타이핑으로 답해보세요"}
        </span>
      );
  }
}

export function MicBar({
  live, listening, enabled, mode, canListen, levels, meterLive,
  typeBarOpen, onMic, onToggleType, onType, micBtnRef
}: Props) {
  const [draft, setDraft] = useState("");
  const typeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeBarOpen) typeRef.current?.focus();
  }, [typeBarOpen]);

  const label = listening
    ? "듣는 중 — 누르면 완료"
    : mode === "shadow" ? "따라 말하기" : "누르고 말하기";

  return (
    <div className="micbar" id="micbar">
      <div className="micbar__live" id="micLive">
        {liveText(live, mode, canListen)}
      </div>

      <div className="micbar__row">
        <div className={"meter" + (meterLive ? " is-live" : "")} id="meter">
          {Array.from({ length: METER_BARS }, (_, i) => (
            <i key={i} style={{ height: `${levels[i] ?? 6}px` }} />
          ))}
        </div>

        <button
          className={"mic-btn" + (listening ? " is-live" : "")}
          id="micBtn"
          aria-label="말하기"
          ref={micBtnRef}
          disabled={!enabled}
          onClick={onMic}
        >
          <span className="mic-btn__icon">🎙</span>
          <span className="mic-btn__label">{label}</span>
        </button>

        <button
          className={"chip-btn" + (typeBarOpen ? " is-on" : "")}
          id="btnType"
          onClick={onToggleType}
        >
          ⌨️ 타이핑으로
        </button>
      </div>

      {typeBarOpen ? (
        <form
          className="typebar" id="typeBar"
          onSubmit={e => {
            e.preventDefault();
            const text = draft.trim();
            if (!text) return;
            setDraft("");
            onType(text);
          }}
        >
          <input
            type="text" id="typeInput" placeholder="영어로 입력해 보세요" autoComplete="off"
            ref={typeRef}
            disabled={!enabled}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <button className="btn btn--primary btn--sm" type="submit">보내기</button>
        </form>
      ) : null}
    </div>
  );
}
