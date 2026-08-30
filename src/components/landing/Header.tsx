"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  { href: "#features", label: "특징" },
  { href: "#characters", label: "AI 캐릭터" },
  { href: "#situations", label: "상황별 학습" },
  { href: "#demo", label: "체험하기" },
  { href: "#faq", label: "FAQ" }
];

export function Header() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setStuck(y > 20);

      // 현재 섹션 표시 — 원본과 같은 -140px 오프셋
      let cur = "";
      document.querySelectorAll<HTMLElement>("main section[id]").forEach(sec => {
        if (y >= sec.offsetTop - 140) cur = sec.id;
      });
      setCurrent(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={"header" + (stuck ? " is-stuck" : "")} id="header">
      <div className="container header__inner">
        <Logo href="#hero" />

        <nav className={"nav" + (open ? " is-open" : "")} id="nav">
          {NAV.map(n => (
            <a
              key={n.href}
              href={n.href}
              className={n.href === "#" + current ? "is-active" : undefined}
              onClick={() => setOpen(false)}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="header__actions">
          <a href="/login" className="btn btn--ghost btn--sm">로그인</a>
          <a href="/practice" className="btn btn--primary btn--sm">🎙 말하기 연습</a>
          <button
            className={"nav-toggle" + (open ? " is-open" : "")}
            id="navToggle"
            aria-label="메뉴 열기"
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  );
}
