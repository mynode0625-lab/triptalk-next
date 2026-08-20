"use client";

import type { SceneTurn } from "@/types/practice";
import { SpeakButton, ShadowButton } from "./tools";

type Props = {
  turn: SceneTurn;
  showModels: boolean;
  onToggleModels: () => void;
};

export function Hint({ turn, showModels, onToggleModels }: Props) {
  return (
    <div className="hint" id="hint">
      <div className="hint__head">
        <b>💬 이렇게 답해보세요</b>
        <button className="link-btn" id="hintToggle" onClick={onToggleModels}>
          {showModels ? "모범 문장 숨기기" : "모범 문장 보기"}
        </button>
      </div>
      <p id="hintKo">{turn.hint}</p>
      {showModels ? (
        <div className="hint__models" id="hintModels">
          {turn.models.map(([en, ko]) => (
            <div className="model" key={en}>
              <span>“{en}”</span>
              <SpeakButton text={en}>🔊</SpeakButton>
              <ShadowButton text={en}>🎯 따라 말하기</ShadowButton>
              <span className="ko">{ko}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
