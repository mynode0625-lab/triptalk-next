"use client";

import { useEffect } from "react";

/**
 * `.reveal` 요소가 뷰포트에 들어오면 `data-in` 을 붙입니다. (script.js 이식)
 *
 * 문서를 한 번만 훑으면 **나중에 붙는 요소가 영영 투명한 채로 남습니다.** 후기
 * 섹션이 그랬습니다 — `/api/reviews` 응답을 받은 뒤에 그려지는데, 그때는 옵저버가
 * 이미 대상을 다 모은 뒤라 `data-in` 이 붙지 않았고, 제목도 작성 폼도 opacity:0
 * 으로 화면에 없는 것처럼 보였습니다. 그래서 새로 추가되는 노드도 함께 지켜봅니다.
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

    const observeWithin = (root: ParentNode) => {
      root.querySelectorAll(".reveal:not([data-in])").forEach(el => io.observe(el));
    };
    observeWithin(document);

    /* 데이터를 받아온 뒤에 그려지는 섹션들을 위해 추가된 노드도 대상에 넣습니다. */
    const mo = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches(".reveal:not([data-in])")) io.observe(node);
          observeWithin(node);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { io.disconnect(); mo.disconnect(); };
  }, []);

  return null;
}
