"use client";

import { useEffect } from "react";

/**
 * `.reveal` 요소가 뷰포트에 들어오면 `.is-in` 을 붙입니다. (script.js 이식)
 * 원본과 동일하게 문서 전체를 한 번 훑습니다.
 */
export function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    document.querySelectorAll(".reveal:not(.is-in)").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
