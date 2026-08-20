"use client";

import { pronTips } from "@/lib/correction/pronunciation";
import type { CorrectionItem } from "@/types/practice";
import { SpeakButton, ShadowButton } from "./tools";

export type WordChip = { w: string; k: "ok" | "warn" | "bad" };

/** 답변 아래에 쌓이는 분석 카드 — practice.js §11 의 insertAdjacentHTML 을 컴포넌트로 옮긴 것 */
export type AnalysisCard =
  | { t: "score"; score: number; face: string; note: string }
  | { t: "pron"; targets: string[] }
  | { t: "goodDictation" }
  | { t: "fix"; items: CorrectionItem[] }
  | { t: "praise"; praises: string[] }
  | { t: "offTopic"; hint: string; model: string }
  | { t: "shadow"; score: number; target: string; chips: WordChip[]; weak: string[] };

function WordPractice({ word, withShadow }: { word: string; withShadow: boolean }) {
  return (
    <div style={{ marginTop: 9 }}>
      <b>{word}</b>{" "}
      <SpeakButton text={word}>🔊</SpeakButton>{" "}
      {withShadow ? <ShadowButton text={word}>🎯 따라 말하기</ShadowButton> : null}
      {pronTips(word).map((t, i) => (
        <span className="why" key={i}>{t}</span>
      ))}
    </div>
  );
}

export function CardView({ card }: { card: AnalysisCard }) {
  switch (card.t) {
    case "score":
      return (
        <div className="card card--score">
          <div className="big">{card.score}<small>/100</small></div>
          <div>
            <b>{card.face} 발음 인식 점수</b>
            <span className="why">
              {card.note}. 음성 인식이 얼마나 정확히 알아들었는지를 기준으로 합니다.
            </span>
          </div>
        </div>
      );

    case "pron":
      return (
        <div className="card card--pron">
          <div className="card__h">🔊 발음 교정 — 이 단어들이 다르게 들렸습니다</div>
          <div className="wchips">
            {card.targets.map(w => (
              <span className="wchip wchip--bad" key={w}>{w}</span>
            ))}
          </div>
          {card.targets.map(w => (
            <WordPractice word={w} withShadow key={w} />
          ))}
        </div>
      );

    case "goodDictation":
      return (
        <div className="card card--good">
          <div className="card__h">✅ 받아쓰기 수정 없음</div>
          말한 그대로 정확히 인식됐습니다. 발음이 또렷했다는 뜻입니다.
        </div>
      );

    case "fix":
      return (
        <div className="card card--fix">
          <div className="card__h">✏️ 표현 교정 — 이렇게 하면 더 자연스럽습니다</div>
          {card.items.map((it, i) => (
            <div key={i}>
              <div className="fixrow">
                <span className="from">{it.from}</span>
                <span className="arrow">→</span>
                <span className="to">{it.to}</span>
                <SpeakButton text={it.to}>🔊</SpeakButton>
              </div>
              <span className="why">{it.why}</span>
            </div>
          ))}
        </div>
      );

    case "praise":
      return (
        <div className="card card--good">
          <div className="card__h">👍 좋았던 점</div>
          {card.praises.map((p, i) => (
            <div key={i}>· {p}</div>
          ))}
        </div>
      );

    case "offTopic":
      return (
        <div className="card card--fix">
          <div className="card__h">🎯 질문의 핵심이 빠졌어요</div>
          <span className="why">{card.hint} — 모범 문장: “{card.model}”</span>
          <div style={{ marginTop: 6 }}>
            <SpeakButton text={card.model}>🔊 들어보기</SpeakButton>{" "}
            <ShadowButton text={card.model}>🎯 따라 말하기</ShadowButton>
          </div>
        </div>
      );

    case "shadow":
      return (
        <div className="card card--pron">
          <div className="card__h">🎯 따라 말하기 결과 — {card.score}점</div>
          <div className="why" style={{ marginBottom: 6 }}>목표: “{card.target}”</div>
          <div className="wchips">
            {card.chips.map((c, i) => (
              <span className={`wchip wchip--${c.k}`} key={i}>{c.w}</span>
            ))}
          </div>
          <span className="why" style={{ marginTop: 7 }}>
            🟩 정확 · 🟨 비슷하게 들림 · 🟥 다르게 들림
          </span>
          {card.weak.slice(0, 3).map((w, i) => (
            <WordPractice word={w} withShadow={false} key={`${w}-${i}`} />
          ))}
          <div style={{ marginTop: 10 }}>
            <SpeakButton text={card.target}>🔊 모범 발음</SpeakButton>{" "}
            <ShadowButton text={card.target}>🔁 한 번 더</ShadowButton>
          </div>
        </div>
      );
  }
}
