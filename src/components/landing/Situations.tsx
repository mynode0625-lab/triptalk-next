"use client";

import { useState } from "react";
import { LEVEL_LABEL, SITUATIONS, SITUATION_TABS } from "@/lib/data/situations";
import type { SituationKey } from "@/types/landing";

export function Situations() {
  const [tab, setTab] = useState<SituationKey>("airport");

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
        {SITUATIONS[tab].map((s, i) => (
          <article className="sit" key={s.title} style={{ animationDelay: `${i * 55}ms` }}>
            <div className="sit__top">
              <span className="sit__emoji">{s.emoji}</span>
              <span className={`sit__level lv-${s.lv}`}>{LEVEL_LABEL[s.lv]}</span>
            </div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
            <div className="sit__phrase">
              <b>핵심 표현</b>
              “{s.en}”<br />
              <span style={{ color: "var(--ink-3)" }}>{s.ko}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
