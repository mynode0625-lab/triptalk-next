"use client";

import { createContext, useContext, useId } from "react";

export type SpeakFn = (text: string, opts?: { slow?: boolean; onEnd?: () => void }) => void;

export type PracticeTools = {
  /** 🔊 듣기 */
  speak: SpeakFn;
  /** 🎯 따라 말하기 */
  shadow: (text: string) => void;
  /** 현재 재생 중인 버튼 id (`.is-playing`) */
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
};

const noop = () => {};

export const ToolsContext = createContext<PracticeTools>({
  speak: noop,
  shadow: noop,
  playingId: null,
  setPlayingId: noop
});

export const useTools = () => useContext(ToolsContext);

/**
 * 🔊 재생 버튼. 원본의 전역 `[data-speak]` 클릭 위임을 대체합니다.
 * 재생 중에는 `.is-playing` 이 붙고, 다른 버튼을 누르면 자동으로 해제됩니다.
 */
export function SpeakButton({
  text,
  slow,
  children
}: {
  text: string;
  slow?: boolean;
  children: React.ReactNode;
}) {
  const id = useId();
  const { speak, playingId, setPlayingId } = useTools();

  return (
    <button
      className={"tool-btn" + (playingId === id ? " is-playing" : "")}
      onClick={() => {
        setPlayingId(id);
        speak(text, { slow, onEnd: () => setPlayingId(null) });
      }}
    >
      {children}
    </button>
  );
}

/** 🎯 따라 말하기 버튼 — 원본의 `[data-shadow]` 위임을 대체합니다. */
export function ShadowButton({
  text,
  children
}: {
  text: string;
  children: React.ReactNode;
}) {
  const { shadow } = useTools();
  return (
    <button className="tool-btn" onClick={() => shadow(text)}>
      {children}
    </button>
  );
}
