"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 뷰포트에 들어오면 0 → target 으로 세는 훅. script.js 의 countUp 이식.
 * reduceMotion 이면 즉시 target 을 표시합니다.
 */
export function useCountUp(target: number, reduceMotion: boolean | null) {
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current || reduceMotion === null) return;

    let raf = 0;
    const run = () => {
      if (reduceMotion) { setValue(target); return; }
      const dur = 1400;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (!e.isIntersecting || done.current) return;
          done.current = true;
          io.unobserve(e.target);
          run();
        });
      },
      { threshold: 0.6 }
    );
    io.observe(el);

    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target, reduceMotion]);

  return { ref, value };
}
