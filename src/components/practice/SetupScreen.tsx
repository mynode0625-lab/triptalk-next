"use client";

import Link from "next/link";

import { SCENES, SCENE_KEYS } from "@/lib/data/scenarios";
import { FREE_LIMIT, type FreeTrial } from "@/lib/practice/freeTrial";
import type { PracticeOptions, SceneKey } from "@/types/practice";

type Props = {
  opts: PracticeOptions;
  setOpts: (fn: (prev: PracticeOptions) => PracticeOptions) => void;
  voices: SpeechSynthesisVoice[];
  onPick: (key: SceneKey) => void;
  onVoiceChange: (voiceURI: string) => void;
  onVoiceTest: () => void;
  /** 서버 TTS 사용 가능 여부 — null 이면 아직 확인 전 */
  serverTts: boolean | null;
  /** 비로그인 무료 횟수 */
  trial: FreeTrial;
};

export function SetupScreen({
  opts, setOpts, voices, onPick, onVoiceChange, onVoiceTest, serverTts, trial
}: Props) {
  /* 튜터 목소리는 평소 우리가 고릅니다. 서버 음성을 쓸 수 없다고 확인된 기기에서만
     기기 내장 음성을 직접 고를 수 있게 열어 줍니다. (확인 전 null 이면 감춥니다.) */
  const showVoicePicker = serverTts === false && voices.length > 0;

  return (
    <section className="setup" id="setup">
      <div className="setup__box">
        <h1>어떤 상황을 연습할까요?</h1>
        <p className="setup__sub">
          캐릭터가 영어로 말을 걸면, <b>마이크를 누르고 소리 내어 답하면</b> 됩니다.
        </p>

        {/* 남은 횟수를 미리 말합니다 — 다 쓰고 나서야 알게 되는 것보다 낫습니다.
            환전 고객에게는 셀 것이 없으므로 잔량 대신 무료라는 사실만 알립니다. */}
        {trial.ready && trial.guest ? (
          trial.partner ? (
            <p className="trial trial--partner">
              💱 슈퍼SOL 환전 고객님께는 <b>횟수 제한 없이</b> 제공됩니다. 로그인도 결제도 필요 없습니다.
            </p>
          ) : (
            <p className={"trial" + (trial.locked ? " trial--out" : "")}>
              {trial.locked ? (
                <>
                  무료 연습 {FREE_LIMIT}회를 모두 사용했습니다.{" "}
                  <Link href="/login">로그인</Link>하면 제한 없이 이어서 연습할 수 있습니다.
                </>
              ) : (
                <>
                  로그인 없이 <b>{trial.left}회</b> 더 연습할 수 있습니다.{" "}
                  <Link href="/login">로그인</Link>하면 제한이 풀립니다.
                </>
              )}
            </p>
          )
        ) : null}

        <div className="setup__grid" id="setupGrid">
          {SCENE_KEYS.map(k => {
            const s = SCENES[k];
            return (
              <button className="scene-card" data-key={k} key={k} onClick={() => onPick(k)}>
                <div className="scene-card__top">
                  <span className="scene-card__ava">{s.char.emoji}</span>
                  <span>
                    <span className="scene-card__name">{s.char.name}</span>{" "}
                    <span className="scene-card__role">{s.char.role}</span>
                  </span>
                </div>
                <h3>{s.emoji} {s.title}</h3>
                <p>{s.desc}</p>
                <div className="scene-card__meta">
                  <span>{s.lv}</span>
                  <span>{s.turns.length}턴</span>
                  <span>{s.char.lang === "en-GB" ? "영국식" : "미국식"}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="setup__opts">
          <label className="opt">
            <span>말하기 속도</span>
            <input
              type="range" id="optRate" min="0.7" max="1.2" step="0.05"
              value={opts.rate}
              onChange={e => {
                const rate = +e.target.value;
                setOpts(p => ({ ...p, rate }));
              }}
            />
            <b id="optRateVal">{String(+opts.rate.toFixed(2))}×</b>
          </label>

          {showVoicePicker ? (
            <label className="opt opt--wide">
              <span>튜터 목소리</span>
              <select
                id="optVoice"
                value={opts.voiceURI}
                onChange={e => onVoiceChange(e.target.value)}
              >
                <option value="">자동</option>
                {voices.slice(0, 14).map(v => (
                  <option value={v.voiceURI} key={v.voiceURI}>{v.name}</option>
                ))}
              </select>
              <button type="button" className="chip-btn" id="optVoiceTest" onClick={onVoiceTest}>
                🔊 들어보기
              </button>
            </label>
          ) : null}

          <label className="opt opt--check">
            <input
              type="checkbox" id="optAuto"
              checked={opts.auto}
              onChange={e => { const auto = e.target.checked; setOpts(p => ({ ...p, auto })); }}
            />
            <span>대사 자동 읽어주기</span>
          </label>

          <label className="opt opt--check">
            <input
              type="checkbox" id="optKo"
              checked={opts.ko}
              onChange={e => { const ko = e.target.checked; setOpts(p => ({ ...p, ko })); }}
            />
            <span>한글 해석 함께 보기</span>
          </label>

          <label className="opt opt--check">
            <input
              type="checkbox" id="optEn"
              checked={opts.en}
              onChange={e => { const en = e.target.checked; setOpts(p => ({ ...p, en })); }}
            />
            <span>영어 자막 항상 보기</span>
          </label>
        </div>

        {/*
          음성 인식은 브라우저가 제공하는 기능이고, 브라우저는 오디오를 자사 서버로
          보내 글자로 바꿉니다. 우리가 만든 동작은 아니지만 사용자의 목소리가 나가는
          일이므로, 마이크를 켜기 전에 화면에서 밝힙니다. — 한 줄 각주로 둡니다.
        */}
        <p className="setup__privacy">
          🎙 음성은 브라우저(Chrome·Safari)의 인식 기능으로 글자로 바뀌며, TripTalk 은
          음성도 말한 내용도 저장하지 않습니다. ⌨️ 타이핑으로 답해도 됩니다.{" "}
          <Link href="/privacy">개인정보처리방침</Link>
        </p>
      </div>
    </section>
  );
}
