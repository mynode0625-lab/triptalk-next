"use client";

import { useCountUp } from "@/lib/hooks/useCountUp";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

/** 숫자는 서버(Hero)에서 실제 데이터를 세어 내려줍니다. lib/data/stats.ts 참고 */
export type StatItem = { count: number; label: string };

function Stat({ count, label, reduce }: { count: number; label: string; reduce: boolean | null }) {
  const { ref, value } = useCountUp(count, reduce);
  return (
    <div className="stat">
      <b ref={ref} data-count={count}>
        {value.toLocaleString()}
      </b>
      <span>{label}</span>
    </div>
  );
}

export function Stats({ stats }: { stats: StatItem[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="container stats reveal">
      {stats.map(s => (
        <Stat key={s.label} count={s.count} label={s.label} reduce={reduce} />
      ))}
    </div>
  );
}
