"use client";

import type { CorrectionItem, PracticeWord } from "@/types/practice";
import { SpeakButton } from "./tools";

type Props = {
  title: string;
  avg: number | string;
  turns: number;
  words: PracticeWord[];
  fixes: CorrectionItem[];
  onClose: () => void;
  onAgain: () => void;
  onOther: () => void;
};

/** 마무리 리포트 — practice.js §14 */
export function ReportModal({ title, avg, turns, words, fixes, onClose, onAgain, onOther }: Props) {
  return (
    <div className="modal" id="report">
      <div className="modal__box">
        <button className="modal__x" id="reportClose" aria-label="닫기" onClick={onClose}>×</button>
        <span className="eyebrow">연습 완료</span>
        <h2 id="reportTitle">{title}</h2>

        <div className="report__stats">
          <div><b id="rScore">{avg}</b><span>평균 발음 점수</span></div>
          <div><b id="rTurns">{turns}</b><span>말한 문장</span></div>
          <div><b id="rWords">{words.length}</b><span>연습할 단어</span></div>
          <div><b id="rFixes">{fixes.length}</b><span>교정된 표현</span></div>
        </div>

        <div className="report__body" id="reportBody">
          {words.length ? (
            <div className="card card--pron">
              <h4>🔊 다시 연습할 단어</h4>
              {words.slice(0, 6).map(w => (
                <div style={{ marginTop: 7 }} key={w.word}>
                  <b>{w.word}</b> <SpeakButton text={w.word}>🔊</SpeakButton>
                  <span className="why">{w.tips[0]}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="card card--good">
              <h4>🔊 발음</h4>
              받아쓰기를 한 번도 고치지 않았습니다. 아주 또렷하게 말했다는 뜻입니다.
            </div>
          )}

          {fixes.length ? (
            <div className="card card--fix">
              <h4>✏️ 오늘 교정된 표현</h4>
              {fixes.slice(0, 6).map((f, i) => (
                <div className="fixrow" key={i}>
                  <span className="from">{f.from}</span>
                  <span className="arrow">→</span>
                  <span className="to">{f.to}</span>
                  <SpeakButton text={f.to}>🔊</SpeakButton>
                </div>
              ))}
            </div>
          ) : (
            <div className="card card--good">
              <h4>✏️ 표현</h4>
              고칠 만한 어색한 표현이 없었습니다. 아주 좋습니다.
            </div>
          )}
        </div>

        <div className="report__cta">
          <button className="btn btn--primary" id="reportAgain" onClick={onAgain}>한 번 더 연습</button>
          <button className="btn btn--outline" id="reportOther" onClick={onOther}>다른 상황 하기</button>
        </div>
      </div>
    </div>
  );
}
