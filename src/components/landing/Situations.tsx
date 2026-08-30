"use client";

import { useState } from "react";
import Link from "next/link";
import { LEVEL_LABEL, SITUATIONS, SITUATION_TABS } from "@/lib/data/situations";
import type { Situation, SituationKey } from "@/types/landing";

/** 카드 한 장의 내용 — 링크로 감싸든 아니든 안쪽은 같습니다. */
function SitBody({ s }: { s: Situation }) {
  return (
    <>
      <div className="sit__top">
        <span className="sit__emoji">{s.emoji}</span>
        <span className="sit__tags">
          {/* 카드는 커리큘럼 전체를 보여주고, 배지가 지금 어디까지 됐는지 말합니다 */}
          {s.scene
            ? <span className="sit__ready">연습 가능</span>
            : <span className="sit__soon">준비 중</span>}
          <span className={`sit__level lv-${s.lv}`}>{LEVEL_LABEL[s.lv]}</span>
        </span>
      </div>
      <h3>{s.title}</h3>
      <p>{s.desc}</p>
      <div className="sit__phrase">
        <b>핵심 표현</b>
        “{s.en}”<br />
        <span style={{ color: "var(--ink-3)" }}>{s.ko}</span>
      </div>
    </>
  );
}

export function Situations() {
  // 기본 표현이 커리큘럼의 시작이라 첫 탭으로 엽니다 (연습실 순서와 동일)
  const [tab, setTab] = useState<SituationKey>("basics");

  return (
    <>
      <div className="tabs reveal" id="tabs" role="tablist">
        {SITUATION_TABS.map(t => (
          <button
            key={t.key}
            className={"tab" + (t.key === tab ? " is-active" : "")}
            data-tab={t.key}
            role="tab"
            aria-selected={t.key === tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* key 를 바꿔 탭 전환마다 rise 애니메이션이 다시 돌게 합니다 */}
      <div className="situations" id="situationGrid" key={tab}>
        {SITUATIONS[tab].map((s, i) => {
          const delay = { animationDelay: `${i * 55}ms` };

          /* "연습 가능" 이라고 써 놓고 누를 수 없으면 그 배지는 안내가 아니라
             광고입니다. 시나리오가 있는 카드는 그대로 연습실로 들어갑니다. */
          return s.scene ? (
            <Link
              className="sit sit--link"
              key={s.title}
              style={delay}
              href={`/practice?scene=${s.scene}`}
            >
              <SitBody s={s} />
              <span className="sit__go">🎙 지금 연습하기 →</span>
            </Link>
          ) : (
            <article className="sit" key={s.title} style={delay}>
              <SitBody s={s} />
            </article>
          );
        })}
      </div>
    </>
  );
}
