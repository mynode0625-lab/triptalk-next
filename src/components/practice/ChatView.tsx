"use client";

import { useEffect, useRef } from "react";
import type { AnalysisCard } from "./cards";
import { CardView } from "./cards";
import { SpeakButton } from "./tools";

export type Msg =
  | { id: number; kind: "typing" }
  | { id: number; kind: "ai"; ai: string; ko: string }
  | { id: number; kind: "me"; text: string; cards: AnalysisCard[] };

type Props = {
  msgs: Msg[];
  avatar: string;
  showKo: boolean;
  onToggleKo: () => void;
  /** 지난 대화 로그로 쓸 때 여백·높이를 바꾸기 위한 클래스 */
  className?: string;
};

export function ChatView({ msgs, avatar, showKo, onToggleKo, className = "talk__chat" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  return (
    <div className={className} id="chat" ref={ref}>
      {msgs.map(m => {
        if (m.kind === "typing") {
          return (
            <div className="msg" key={m.id}>
              <div className="msg__ava">{avatar}</div>
              <div className="typing"><i></i><i></i><i></i></div>
            </div>
          );
        }
        if (m.kind === "ai") {
          return (
            <div className="msg" key={m.id}>
              <div className="msg__ava">{avatar}</div>
              <div className="msg__body">
                <div className="say">
                  {m.ai}
                  <small className="say__ko" style={showKo ? undefined : { display: "none" }}>
                    {m.ko}
                  </small>
                </div>
                <div className="say__tools">
                  <SpeakButton text={m.ai}>🔊 다시 듣기</SpeakButton>
                  <SpeakButton text={m.ai} slow>🐢 천천히</SpeakButton>
                  <button className="tool-btn" onClick={onToggleKo}>
                    {showKo ? "해석 숨기기" : "해석 보기"}
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="msg msg--me" key={m.id}>
            <div className="msg__ava">🙂</div>
            <div className="msg__body">
              <div className="say">{m.text}</div>
              <div className="analysis">
                {m.cards.map((c, i) => (
                  <CardView card={c} key={i} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** id 를 빼되 유니온을 유지하는 헬퍼 — pushMsg 인자 타입 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewMsg = DistributiveOmit<Msg, "id">;
