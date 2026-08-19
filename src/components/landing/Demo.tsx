"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO, type DemoKey } from "@/lib/data/demo";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { sleep } from "@/lib/hooks/useSleep";

type Bubble = { kind: "ai" | "me" | "tip"; text: string; sub?: string };

/** 선택지 영역 상태 — 원본의 renderChoices() 세 갈래를 그대로 옮긴 것 */
type Choices =
  | { mode: "none" }
  | { mode: "list"; turn: number; disabled: boolean }
  | { mode: "done" };

const DEMO_KEYS = Object.keys(DEMO) as DemoKey[];

/** 인터랙티브 데모 — 시나리오 선택 + 선택지 분기 대화 (script.js 이식) */
export function Demo() {
  const reduce = useReducedMotion();
  const [demoKey, setDemoKey] = useState<DemoKey>("checkin");
  const [turnIdx, setTurnIdx] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<Choices>({ mode: "none" });
  const [started, setStarted] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const aliveRef = useRef(true);
  /** startDemo 가 겹쳐 돌지 않도록 하는 실행 토큰 */
  const runRef = useRef(0);
  const busyRef = useRef(false);

  const scene = DEMO[demoKey];
  const pause = useCallback((ms: number) => sleep(reduce ? 60 : ms), [reduce]);

  const setBusyBoth = useCallback((v: boolean) => {
    busyRef.current = v;
    setBusy(v);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  /* 채팅을 항상 바닥에 붙입니다 */
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [bubbles, typing]);

  /** 현재 턴의 AI 대사를 재생합니다. (원본 askTurn) */
  const askTurn = useCallback(
    async (key: DemoKey, idx: number, token: number) => {
      const sc = DEMO[key];
      if (idx >= sc.turns.length) { setChoices({ mode: "done" }); return; }

      setBusyBoth(true);
      setChoices({ mode: "none" });
      setTyping(true);
      await pause(800);
      if (!aliveRef.current || runRef.current !== token) return;
      setTyping(false);

      const turn = sc.turns[idx];
      setBubbles(prev => [...prev, { kind: "ai", text: turn.ai, sub: turn.aiKo }]);
      setBusyBoth(false);
      setChoices({ mode: "list", turn: idx, disabled: false });
    },
    [pause, setBusyBoth]
  );

  const startDemo = useCallback(
    (key: DemoKey) => {
      const token = ++runRef.current;
      setDemoKey(key);
      setTurnIdx(0);
      setBubbles([]);
      setTyping(false);
      void askTurn(key, 0, token);
    },
    [askTurn]
  );

  /* 데모 섹션이 처음 보일 때 시작 */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || started || reduce === null) return;
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setStarted(true);
            startDemo("checkin");
            io.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [started, startDemo, reduce]);

  const onChoice = async (i: number) => {
    if (busyRef.current) return;
    const token = runRef.current;
    setBusyBoth(true);
    setChoices(c => (c.mode === "list" ? { ...c, disabled: true } : c));

    const choice = scene.turns[turnIdx].choices[i];
    setBubbles(prev => [...prev, { kind: "me", text: choice.t }]);
    await pause(560);
    if (!aliveRef.current || runRef.current !== token) return;
    setBubbles(prev => [
      ...prev,
      { kind: "tip", text: `${choice.good ? "✅" : "✏️"} ${choice.fb}` }
    ]);

    const next = turnIdx + 1;
    setTurnIdx(next);
    setBusyBoth(false);
    await pause(900);
    if (!aliveRef.current || runRef.current !== token) return;
    void askTurn(demoKey, next, token);
  };

  return (
    <section className="section section--dark" id="demo" ref={sectionRef}>
      <div className="container">
        <div className="section-head section-head--light reveal">
          <span className="eyebrow">3분 체험</span>
          <h2>지금 바로 한 마디 해보세요</h2>
          <p>
            아래는 흐름만 보여주는 맛보기입니다. <b>실제로 입으로 말하는 연습</b>은 말하기 연습실에서 하세요.
          </p>
          <a href="/practice" className="btn btn--primary btn--lg" style={{ marginTop: 20 }}>
            🎙 말하기 연습실 열기
          </a>
        </div>

        <div className="demo reveal">
          <aside className="demo__side">
            <h4>상황 선택</h4>
            <div className="demo__scenarios" id="demoScenarios">
              {DEMO_KEYS.map(k => (
                <button
                  key={k}
                  className={"scenario" + (k === demoKey ? " is-active" : "")}
                  data-key={k}
                  onClick={() => { if (!busy) startDemo(k); }}
                >
                  {DEMO[k].label}
                </button>
              ))}
            </div>
            <div className="demo__tip">
              <b>💡 Tip</b>
              <p>
                실제 앱에서는 선택지 대신 <b>직접 말해서</b> 대화합니다. 여기서는 맛보기로 보기를 골라주세요.
              </p>
            </div>
          </aside>

          <div className="demo__main">
            <div className="demo__head">
              <div className="demo__avatar" id="demoAvatar">{scene.icon}</div>
              <div>
                <strong id="demoName">{scene.name}</strong>
                <small id="demoRole">{scene.role}</small>
              </div>
              <button
                className="btn btn--ghost btn--sm"
                id="demoReset"
                onClick={() => { if (!busy) startDemo(demoKey); }}
              >
                다시 시작
              </button>
            </div>

            <div className="demo__chat" id="demoChat" ref={chatRef}>
              {bubbles.map((b, i) => (
                <div className={"bubble bubble--" + b.kind} key={i}>
                  {b.text}
                  {b.sub ? <small>{b.sub}</small> : null}
                </div>
              ))}
              {typing ? (
                <div className="bubble bubble--ai typing"><i></i><i></i><i></i></div>
              ) : null}
            </div>

            <div className="demo__choices" id="demoChoices">
              {choices.mode === "done" ? (
                <div className="demo__done">{scene.end}</div>
              ) : choices.mode === "list" ? (
                scene.turns[choices.turn].choices.map((c, i) => (
                  <button
                    key={i}
                    className="choice"
                    data-i={i}
                    disabled={choices.disabled}
                    onClick={() => onChoice(i)}
                  >
                    {c.t}
                  </button>
                ))
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
