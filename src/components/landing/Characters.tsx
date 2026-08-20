"use client";

import { useState } from "react";
import { CHARACTERS } from "@/lib/data/characters";

/** AI 캐릭터 카드 — 클릭하면 첫 마디가 펼쳐집니다. (script.js 이식) */
export function Characters() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="characters" id="characterGrid">
      {CHARACTERS.map((c, i) => {
        const isOpen = open === i;
        return (
          <button
            key={c.name}
            className={"char reveal" + (isOpen ? " is-open" : "")}
            data-i={i}
            aria-expanded={isOpen}
            onClick={() => setOpen(isOpen ? null : i)}
          >
            <div className="char__avatar">{c.emoji}</div>
            <div className="char__name">{c.name}</div>
            <div className="char__role">{c.role}</div>
            <p className="char__desc">{c.desc}</p>
            <div className="char__tags">
              {c.tags.map(t => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="char__line">
              <q>
                “{c.line}”<em>{c.ko}</em>
              </q>
            </div>
          </button>
        );
      })}
    </div>
  );
}
