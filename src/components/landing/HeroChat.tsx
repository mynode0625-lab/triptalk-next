"use client";

import { useEffect, useRef, useState } from "react";
import { HERO_SCRIPT } from "@/lib/data/hero";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { sleep } from "@/lib/hooks/useSleep";
import type { HeroLine } from "@/types/landing";

const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

function Bubble({ item }: { item: HeroLine }) {
  return (
    <div className={"bubble bubble--" + item.who}>
      {item.text}
      {item.sub ? <small>{item.sub}</small> : null}
    </div>
  );
}

/** 히어로 폰 목업의 채팅 자동 재생 (script.js playHeroChat 이식) */
export function HeroChat() {
  const reduce = useReducedMotion();
  const chatRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<HeroLine[]>([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (reduce !== false) return;   // 판정 전이거나 모션 최소화면 애니메이션 없음

    let alive = true;
    void (async () => {
      while (alive) {
        setLines([]);
        for (const item of HERO_SCRIPT) {
          if (!alive) return;
          if (item.who === "ai") {
            setTyping(true);
            await sleep(760);
            if (!alive) return;
            setTyping(false);
          }
          setLines(prev => [...prev, item]);

          // 넘치면 오래된 말풍선부터 제거 (원본의 while 루프)
          await nextFrame();
          const el = chatRef.current;
          while (alive && el && el.scrollHeight > el.clientHeight && el.children.length > 1) {
            setLines(prev => (prev.length > 1 ? prev.slice(1) : prev));
            await nextFrame();
          }

          await sleep(item.who === "tip" ? 1700 : 1250);
        }
        await sleep(2600);
      }
    })();

    return () => { alive = false; };
  }, [reduce]);

  // 모션 최소화 설정이면 전체 대화를 한 번에 보여줍니다.
  const visible = reduce ? HERO_SCRIPT : lines;

  return (
    <div className="chat" id="heroChat" ref={chatRef}>
      {visible.map((item, i) => (
        <Bubble key={i} item={item} />
      ))}
      {typing ? (
        <div className="bubble bubble--ai typing">
          <i></i><i></i><i></i>
        </div>
      ) : null}
    </div>
  );
}
