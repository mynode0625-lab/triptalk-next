"use client";

import { SCENES, SCENE_KEYS } from "@/lib/data/scenarios";
import { PREMIUM_VOICE } from "@/lib/speech/engine";
import type { PracticeOptions, SceneKey, TtsOptions } from "@/types/practice";

export type TtsStatus = { msg: string; warn: boolean } | null;

type Props = {
  opts: PracticeOptions;
  setOpts: (fn: (prev: PracticeOptions) => PracticeOptions) => void;
  voices: SpeechSynthesisVoice[];
  onPick: (key: SceneKey) => void;
  onVoiceChange: (voiceURI: string) => void;
  onVoiceTest: () => void;
  /** 고급 음성 설정 폼 (아직 저장 전 값) */
  ttsDraft: TtsOptions;
  setTtsDraft: (fn: (prev: TtsOptions) => TtsOptions) => void;
  onTtsSave: () => void;
  onTtsClear: () => void;
  ttsStatus: TtsStatus;
  /** 서버 TTS 사용 가능 여부 — null 이면 아직 확인 전 */
  serverTts: boolean | null;
};

export function SetupScreen({
  opts, setOpts, voices, onPick, onVoiceChange, onVoiceTest,
  ttsDraft, setTtsDraft, onTtsSave, onTtsClear, ttsStatus, serverTts
}: Props) {
  /* 기기에 사람처럼 들리는 음성이 하나도 없으면 안내합니다.
     (서버 음성이나 개인 키를 쓰는 중이면 내장 음성 품질은 상관없습니다.) */
  const usingCloud = serverTts === true || !!(opts.tts.provider && opts.tts.key);
  const hasNatural = voices.some(
    v => PREMIUM_VOICE.test(v.name) || /google/i.test(v.name) || !v.localService
  );
  const showVoiceHint = !usingCloud && voices.length > 0 && !hasNatural;

  return (
    <section className="setup" id="setup">
      <div className="setup__box">
        <h1>어떤 상황을 연습할까요?</h1>
        <p className="setup__sub">
          캐릭터가 영어로 말을 걸면, <b>마이크를 누르고 소리 내어 답하면</b> 됩니다.
        </p>

        {/*
          음성 인식은 브라우저가 제공하는 기능이고, 브라우저는 오디오를 자사 서버로
          보내 글자로 바꿉니다. 우리가 만든 동작은 아니지만 사용자의 목소리가 나가는
          일이므로, 마이크를 켜기 전에 화면에서 밝힙니다.
        */}
        <p className="setup__privacy">
          🎙 <b>마이크를 누르면</b> 음성이 브라우저의 음성 인식 서비스
          (Chrome은 Google, Safari는 Apple)로 전송되어 글자로 바뀝니다.
          TripTalk 서버는 음성도, 말한 내용도 저장하지 않습니다.
          마이크를 쓰고 싶지 않다면 <b>⌨️ 타이핑으로</b> 답해도 연습은 그대로 진행됩니다.
        </p>

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

          <label className="opt opt--wide">
            <span>튜터 목소리</span>
            <select
              id="optVoice"
              value={opts.voiceURI}
              onChange={e => onVoiceChange(e.target.value)}
            >
              {voices.length === 0 ? (
                <option value="">사용 가능한 영어 음성 없음</option>
              ) : (
                <>
                  <option value="">자동 (가장 자연스러운 음성)</option>
                  {voices.slice(0, 14).map(v => (
                    <option value={v.voiceURI} key={v.voiceURI}>
                      {v.name} · {v.lang}{v.localService ? "" : " · 온라인"}
                    </option>
                  ))}
                </>
              )}
            </select>
            <button type="button" className="chip-btn" id="optVoiceTest" onClick={onVoiceTest}>
              🔊 들어보기
            </button>
          </label>

          {showVoiceHint ? (
            <p className="opt__hint">
              🤖 <b>지금 기기에는 기본 음성만 설치돼 있어 딱딱하게 들립니다.</b>{" "}
              아래 <b>🎧 더 사람 같은 목소리로 듣기</b>를 펼쳐 고품질 음성을 내려받으면
              (무료, 2분) 훨씬 사람처럼 들립니다.
            </p>
          ) : null}

          {serverTts === true ? (
            <p className="opt__hint opt__hint--ok">
              ✅ 사람 목소리에 가까운 <b>미국식 AI 음성</b>으로 읽어줍니다.
            </p>
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

        <details className="adv">
          <summary>
            🎧 더 사람 같은 목소리로 듣기 <span className="adv__tag">선택</span>
          </summary>
          <div className="adv__body">
            <p className="adv__lead">
              기본은 <b>브라우저 내장 음성</b>입니다. 기기에 따라 딱딱하게 들릴 수 있어요.
              아래 두 가지 방법으로 훨씬 자연스럽게 만들 수 있습니다.
            </p>

            <div className="adv__how">
              <b>1. 무료 — 기기의 고품질 음성 켜기</b>
              <ul>
                <li><b>Chrome</b>: 위 ‘튜터 목소리’에서 <b>Google US English</b> 를 고르세요. 가장 매끄럽습니다.</li>
                <li><b>맥</b>: 시스템 설정 → 손쉬운 사용 → 말하기 → 시스템 음성 → <b>영어(미국)</b> →
                    <b>Samantha(향상됨)</b> 또는 <b>Ava(프리미엄)</b> 내려받기 — 기본 음성과 확연히 다릅니다</li>
                <li><b>아이폰</b>: 설정 → 손쉬운 사용 → 음성 콘텐츠 → 음성 → 영어 → <b>향상된 음성</b> 내려받기</li>
                <li><b>윈도우</b>: 설정 → 시간 및 언어 → 음성 → <b>Microsoft Aria/Guy (Natural)</b> 추가</li>
              </ul>
            </div>

            <div className="adv__how">
              <b>2. 사람과 구분이 어려운 AI 음성 쓰기 (API 키 필요)</b>
              <p className="adv__warn">
                키는 <b>이 브라우저에만 저장</b>되고 해당 업체 서버로만 전송됩니다. 개인 기기에서만 쓰세요.
                공개 사이트에 올릴 때는 키를 넣지 마세요.
              </p>
              <div className="adv__row">
                <select
                  id="ttsProvider"
                  value={ttsDraft.provider}
                  onChange={e => {
                    const provider = e.target.value as TtsOptions["provider"];
                    setTtsDraft(p => ({ ...p, provider }));
                  }}
                >
                  <option value="">사용 안 함 (브라우저 내장 음성)</option>
                  <option value="openai">OpenAI · gpt-4o-mini-tts</option>
                  <option value="eleven">ElevenLabs</option>
                </select>
                <input
                  type="password" id="ttsKey" placeholder="API 키를 붙여넣으세요" autoComplete="off"
                  value={ttsDraft.key}
                  onChange={e => { const key = e.target.value; setTtsDraft(p => ({ ...p, key })); }}
                />
                <input
                  type="text" id="ttsVoice" placeholder="음성 ID (비우면 기본값)" autoComplete="off"
                  value={ttsDraft.voice}
                  onChange={e => { const voice = e.target.value; setTtsDraft(p => ({ ...p, voice })); }}
                />
              </div>
              <div className="adv__row">
                <button type="button" className="btn btn--primary btn--sm" id="ttsSave" onClick={onTtsSave}>
                  저장하고 테스트
                </button>
                <button type="button" className="chip-btn" id="ttsClear" onClick={onTtsClear}>
                  키 삭제
                </button>
                <span
                  className={"adv__status" + (ttsStatus ? (ttsStatus.warn ? " is-warn" : " is-ok") : "")}
                  id="ttsStatus"
                >
                  {ttsStatus?.msg ?? ""}
                </span>
              </div>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
