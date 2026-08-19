"use client";

import { STATS } from "@/lib/data/hero";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

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

export function Stats() {
  const reduce = useReducedMotion();
  return (
    <div className="container stats reveal">
      {STATS.map(s => (
        <Stat key={s.label} count={s.count} label={s.label} reduce={reduce} />
      ))}
    </div>
  );
}
