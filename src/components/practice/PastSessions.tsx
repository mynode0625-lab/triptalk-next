"use client";

import { useEffect, useState } from "react";
import { SCENES } from "@/lib/data/scenarios";
import type { SceneKey } from "@/types/practice";

/**
 * 지난 연습.
 *
 * **로그인한 사람에게만 보입니다.** 로그인하지 않았거나 기록이 없으면 아무것도
 * 그리지 않습니다 — 빈 자리를 만들어 두는 것보다 없는 편이 낫습니다.
 *
 * ⚠ 지금 로그인은 데모라 로그아웃하면 다른 사람이 됩니다. 그래서 이 목록은
 * "지금 로그인해 있는 동안의 기록" 에 가깝습니다. 그 사실을 화면에서 밝힙니다 —
 * 며칠 뒤에 와서 기록이 없어졌다고 느끼는 편이 더 나쁩니다.
 */

type Session = {
  id: string;
  sceneKey: string;
  turns: number;
  avgScore: number | null;
  createdAt: string;
};

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const sceneTitle = (key: string): string =>
  (SCENES as Record<string, { title: string; emoji: string } | undefined>)[key]
    ? `${SCENES[key as SceneKey].emoji} ${SCENES[key as SceneKey].title}`
    : key;

export function PastSessions() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetch("/api/practice/sessions", { cache: "no-store" })
      .then(res => res.json() as Promise<{ sessions?: Session[]; signedIn?: boolean }>)
      .then(data => {
        if (!alive) return;
        setSessions(data.signedIn ? (data.sessions ?? []) : []);
      })
      .catch(() => { if (alive) setSessions([]); });
    return () => { alive = false; };
  }, []);

  const clear = async () => {
    if (busy) return;
    if (!window.confirm("지난 연습 기록을 모두 지웁니다. 되돌릴 수 없습니다.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/practice/sessions", { method: "DELETE" });
      if (res.ok) setSessions([]);
    } catch {
      /* 실패하면 그대로 둡니다 — 지워진 것처럼 보이는 쪽이 더 나쁩니다 */
    } finally {
      setBusy(false);
    }
  };

  if (!sessions || sessions.length === 0) return null;

  return (
    <section className="past">
      <div className="past__head">
        <h2>지난 연습</h2>
        <button type="button" className="past__clear" disabled={busy} onClick={() => void clear()}>
          기록 지우기
        </button>
      </div>

      <ul className="past__list">
        {sessions.map(s => (
          <li className="past__item" key={s.id}>
            <span className="past__scene">{sceneTitle(s.sceneKey)}</span>
            <span className="past__meta">
              {when(s.createdAt)} · {s.turns}문장
              {s.avgScore !== null ? ` · 평균 ${s.avgScore}점` : " · 타이핑으로 연습"}
            </span>
          </li>
        ))}
      </ul>

      <p className="past__note">
        로그인한 상태에서만 쌓입니다. 지금은 로그아웃하면 다음 로그인 때 새 기록으로
        시작합니다 — 계정 연동이 끝나면 이어집니다.
      </p>
    </section>
  );
}
