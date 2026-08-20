"use client";

import { useState } from "react";
import { ChatView, type Msg } from "./ChatView";

type Props = {
  msgs: Msg[];
  avatar: string;
  showKo: boolean;
  onToggleKo: () => void;
};

/** 지난 대화와 피드백 전체 기록 — 기본은 접혀 있습니다. */
export function TranscriptLog({ msgs, avatar, showKo, onToggleKo }: Props) {
  const [open, setOpen] = useState(false);
  const count = msgs.filter(m => m.kind === "me").length;

  return (
    <div className={"log" + (open ? " is-open" : "")}>
      <button className="log__head" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="log__caret">▸</span>
        지난 대화 · 피드백
        <span className="count">{count}</span>
      </button>
      {open ? (
        <div className="log__body">
          <ChatView
            className="talk__chat talk__chat--log"
            msgs={msgs}
            avatar={avatar}
            showKo={showKo}
            onToggleKo={onToggleKo}
          />
        </div>
      ) : null}
    </div>
  );
}
