"use client";

import type { CorrectionItem, PracticeWord } from "@/types/practice";
import { SpeakButton, ShadowButton } from "./tools";

type Props = {
  hidden: boolean;
  avg: number | null;
  scoreCount: number;
  words: PracticeWord[];
  fixes: CorrectionItem[];
  onRestart: () => void;
};

export function SidePanel({ hidden, avg, scoreCount, words, fixes, onRestart }: Props) {
  const note =
    avg === null
      ? "아직 기록이 없습니다"
      : `${scoreCount}개 문장 평균 · ${
          avg >= 88 ? "아주 또렷합니다" : avg >= 72 ? "잘 전달되고 있습니다" : "천천히, 끝소리까지 살려보세요"
        }`;

  return (
    <aside className={"panel" + (hidden ? " is-hidden" : "")} id="panel">
      <div className="panel__block">
        <h3>발음 인식 점수</h3>
        <div className="gauge">
          <div className="gauge__num" id="scoreNum">{avg === null ? "–" : avg}</div>
          <div className="gauge__bar"><i id="scoreBar" style={{ width: `${avg ?? 0}%` }} /></div>
          <small id="scoreNote">{note}</small>
        </div>
      </div>

      <div className="panel__block">
        <h3>🔊 발음 연습 단어 <span className="count" id="wordCount">{words.length}</span></h3>
        <div className="wordlist" id="wordList">
          {words.length ? (
            words.map(w => (
              <div className="wl-item" key={w.word}>
                <div className="wl-item__top">
                  <b>{w.word}</b>
                  <span>
                    <SpeakButton text={w.word}>🔊</SpeakButton>
                    <ShadowButton text={w.word}>🎯</ShadowButton>
                  </span>
                </div>
                <p>{w.tips[0]}</p>
              </div>
            ))
          ) : (
            <p className="empty">인식이 어긋난 단어가 여기에 모입니다.</p>
          )}
        </div>
      </div>

      <div className="panel__block">
        <h3>✏️ 표현 교정 카드 <span className="count" id="fixCount">{fixes.length}</span></h3>
        <div className="fixlist" id="fixList">
          {fixes.length ? (
            fixes.map((f, i) => (
              <div className="fx-item" key={i}>
                <span className="from">{f.from}</span>
                <span className="to">{f.to}</span>
              </div>
            ))
          ) : (
            <p className="empty">더 자연스러운 표현이 여기에 쌓입니다.</p>
          )}
        </div>
      </div>

      <button className="btn btn--outline btn--block btn--sm" id="btnRestart" onClick={onRestart}>
        이 상황 다시 연습
      </button>
    </aside>
  );
}
