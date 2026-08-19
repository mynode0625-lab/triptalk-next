"use client";

import type { AnalysisCard } from "./cards";
import { CardView } from "./cards";

/**
 * 직전 답변과 그 피드백. 다음 답변을 할 때까지 화면에 남습니다.
 * (카드 구성은 채팅형 화면과 완전히 동일합니다.)
 */
export function FeedbackStrip({ text, cards }: { text: string; cards: AnalysisCard[] }) {
  return (
    <div className="fbstrip">
      <div className="fbstrip__me">
        <span className="fbstrip__label">내 답변</span>
        <p>{text}</p>
      </div>
      {cards.length ? (
        <div className="analysis">
          {cards.map((c, i) => (
            <CardView card={c} key={i} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
