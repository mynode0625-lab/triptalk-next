"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { fetchSession, logout } from "@/lib/auth/session";

const NAV = [
  { href: "#features", label: "특징" },
  { href: "#characters", label: "AI 캐릭터" },
  { href: "#situations", label: "상황별 학습" },
  { href: "#demo", label: "체험하기" },
  { href: "#faq", label: "FAQ" }
];

export function Header() {
  const [stuck, setStuck] = useState(false);
  /**
   * 로그인 여부.
   *
   * null 은 "아직 모른다" 입니다. 세션은 서버에 물어봐야 알 수 있는데, 확인이
   * 끝나기 전에 "로그아웃" 을 보여주면 로그인하지 않은 사람에게 잘못된 상태를
   * 알리게 됩니다. 모르는 동안에는 로그인 쪽을 보여 두고, 답이 오면 바꿉니다.
   */
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");

  useEffect(() => {
    let alive = true;
    void fetchSession().then(session => {
      if (alive) setSignedIn(Boolean(session));
    });
    return () => { alive = false; };
  }, []);

  const onLogout = async () => {
    await logout();
    setSignedIn(false);
  };

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
          {signedIn ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onLogout}>
              로그아웃
            </button>
          ) : (
            <a href="/login" className="btn btn--ghost btn--sm">로그인</a>
          )}
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
