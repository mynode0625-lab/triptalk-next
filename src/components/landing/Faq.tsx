"use client";

import { useRef, useState } from "react";
import { FAQS } from "@/lib/data/faqs";

/** FAQ 아코디언 — 한 번에 하나만 열립니다. (script.js 이식) */
export function Faq() {
  const [open, setOpen] = useState<{ i: number; maxHeight: number } | null>(null);
  const answers = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <div className="faq" id="faqList">
      {FAQS.map((f, i) => {
        const isOpen = open?.i === i;
        return (
          <div className={"faq__item reveal" + (isOpen ? " is-open" : "")} key={f.q}>
            <button
              className="faq__q"
              aria-expanded={isOpen}
              aria-controls={`faq-a-${i}`}
              onClick={() => {
                // 원본과 동일하게 scrollHeight 를 max-height 로 지정해 펼칩니다
                if (isOpen) setOpen(null);
                else setOpen({ i, maxHeight: answers.current[i]?.scrollHeight ?? 0 });
              }}
            >
              <span>{f.q}</span>
              <span className="faq__icon">+</span>
            </button>
            <div
              className="faq__a"
              id={`faq-a-${i}`}
              ref={el => { answers.current[i] = el; }}
              style={isOpen ? { maxHeight: open.maxHeight } : undefined}
            >
              <p>{f.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
