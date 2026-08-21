"use client";

import { useEffect } from "react";

/**
 * `.reveal` 요소가 뷰포트에 들어오면 `data-in` 을 붙입니다. (script.js 이식)
 * 원본과 동일하게 문서 전체를 한 번 훑습니다.
 *
 * 클래스가 아니라 **속성**인 이유 — React 가 관리하는 요소에 클래스를 직접
 * 붙이면, 그 요소가 다시 그려질 때 className 이 통째로 덮어써지며 사라진다.
 * FAQ·캐릭터 카드처럼 클릭으로 클래스가 바뀌는 요소가 그랬다. 펼치는 순간
 * `is-in` 이 날아가 opacity:0 으로 돌아가고, 옵저버는 이미 관찰을 끊어서
 * 다시 붙지도 않았다. React 가 건드리지 않는 속성에 두면 이 충돌이 없다.
 */
export function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    document.querySelectorAll(".reveal:not([data-in])").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
