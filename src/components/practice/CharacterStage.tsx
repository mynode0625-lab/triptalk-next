"use client";

import type { SceneCharacter } from "@/types/practice";
import { SpeakButton } from "./tools";

export type StageLine = { ai: string; ko: string };

type Props = {
  char: SceneCharacter;
  /** 지금 캐릭터가 하는 말. 아직 없으면 null */
  line: StageLine | null;
  /** 다음 말을 준비하는 중 */
  thinking: boolean;
  /** 음성 재생 중 — 아바타 링이 퍼집니다 */
  speaking: boolean;
  /** 영어 자막 표시 여부 (항상 보기 설정 또는 이번 턴만 펼치기) */
  showEn: boolean;
  showKo: boolean;
  onRevealEn: () => void;
  onHideEn: () => void;
  onToggleKo: () => void;
};

/**
 * 캐릭터와 1:1로 마주 보는 무대 화면.
 * 대사는 소리가 먼저고, 영어 자막은 사용자가 선택할 때만 보입니다.
 */
export function CharacterStage({
  char, line, thinking, speaking, showEn, showKo, onRevealEn, onHideEn, onToggleKo
}: Props) {
  const ready = !!line && !thinking;

  return (
    <>
      <div className="stagearea">
        <div className={"stagearea__ava" + (speaking ? " is-speaking" : "")}>
          <span>{char.emoji}</span>
        </div>
        <div className="stagearea__who">
          <strong>{char.name}</strong>
          <small>{char.role}</small>
        </div>
      </div>

      {/* 지금 하는 말은 위에 고정 — 아래 피드백을 읽는 동안에도 계속 보입니다 */}
      <div className="stageline">
        <div className="line">
          {!ready ? (
            <div className="typing"><i></i><i></i><i></i></div>
          ) : (
            <>
              {showEn ? (
                <p className="line__en">{line.ai}</p>
              ) : (
                <button className="line__reveal" onClick={onRevealEn}>
                  <span>👁 영어 자막 보기</span>
                  <small>먼저 소리에 집중해 보세요</small>
                </button>
              )}
              {showKo ? <p className="line__ko">{line.ko}</p> : null}
            </>
          )}
        </div>

        {ready ? (
          <div className="line__tools">
            <SpeakButton text={line.ai}>🔊 다시 듣기</SpeakButton>
            <SpeakButton text={line.ai} slow>🐢 천천히</SpeakButton>
            {showEn ? (
              <button className="tool-btn" onClick={onHideEn}>🙈 자막 숨기기</button>
            ) : null}
            <button className="tool-btn" onClick={onToggleKo}>
              {showKo ? "해석 숨기기" : "해석 보기"}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
