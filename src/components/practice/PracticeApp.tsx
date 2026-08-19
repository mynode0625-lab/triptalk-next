"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SCENES } from "@/lib/data/scenarios";
import { analyzeExpression } from "@/lib/correction/expression";
import { pronTips } from "@/lib/correction/pronunciation";
import { alignWords, similar, words as toWords } from "@/lib/correction/textDiff";
import { sleep } from "@/lib/hooks/useSleep";
import { getEngine } from "@/lib/speech/engine";
import { useStoredTts, writeStoredTts } from "@/lib/speech/ttsStore";
import { useMicLevel } from "@/lib/speech/useMicLevel";
import { ERROR_MESSAGES, useSpeechRecognition } from "@/lib/speech/useSpeechRecognition";
import type {
  CorrectionItem, PracticeOptions, PracticeWord, SceneKey, TtsOptions
} from "@/types/practice";

import type { AnalysisCard, WordChip } from "./cards";
import { CharacterStage } from "./CharacterStage";
import { type Msg, type NewMsg } from "./ChatView";
import { FeedbackStrip } from "./FeedbackStrip";
import { TranscriptLog } from "./TranscriptLog";
import { ConfirmBar, type ConfirmState } from "./ConfirmBar";
import { Hint } from "./Hint";
import { MicBar, type MicLive } from "./MicBar";
import { ReportModal } from "./ReportModal";
import { SetupScreen, type TtsStatus } from "./SetupScreen";
import { SidePanel } from "./SidePanel";
import { ToolsContext } from "./tools";
import { TopBar } from "./TopBar";
import { Warnings } from "./Warnings";

const SAMPLE = "Good morning! Where are you flying to today?";

const EMPTY_VOICES: SpeechSynthesisVoice[] = [];

/* useSyncExternalStore 인자는 렌더마다 새로 만들지 않도록 모듈 스코프에 둡니다. */
const subscribeVoices = (cb: () => void) => getEngine().subscribeVoices(cb);
const getVoicesSnapshot = () => getEngine().getEnglishVoicesSnapshot();
const getVoicesServerSnapshot = () => EMPTY_VOICES;

type SubmitMeta = { heard: string; confidence: number; spoken: boolean };

export function PracticeApp() {
  /* ── 화면 상태 ─────────────────────────────────── */
  const [screen, setScreen] = useState<"setup" | "stage">("setup");
  const [sceneKey, setSceneKey] = useState<SceneKey | null>(null);
  const [turn, setTurn] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [finished, setFinished] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [panelHidden, setPanelHidden] = useState(false);

  const [hintVisible, setHintVisible] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  /** null = 사용자가 손대지 않음 → 음성 인식을 못 쓰면 자동으로 열립니다 (P-10) */
  const [typeBarOverride, setTypeBarOverride] = useState<boolean | null>(null);

  const [micEnabled, setMicEnabledState] = useState(false);
  const [micLive, setMicLive] = useState<MicLive>({ kind: "hint" });
  const [mode, setMode] = useState<"answer" | "shadow">("answer");
  const [playingId, setPlayingId] = useState<string | null>(null);
  /** 음성 재생 중 — 캐릭터 아바타가 말하는 표시 */
  const [speaking, setSpeaking] = useState(false);
  /** 이번 턴만 영어 자막 펼치기. 다음 대사가 나오면 다시 접힙니다. */
  const [revealEn, setRevealEn] = useState(false);
  /** 서버 TTS(`/api/tts`) 사용 가능 여부 — null 이면 아직 확인 전 */
  const [serverTts, setServerTts] = useState<boolean | null>(null);

  /* ── 옵션 ─────────────────────────────────────── */
  // 속도·자동재생·해석은 세션 한정, 보이스/클라우드 키는 localStorage 에 남습니다.
  // 자막·해석 모두 기본 꺼짐 — 먼저 귀로 듣게 합니다
  const [session, setSession] = useState({ rate: 1, auto: true, ko: false, en: false });
  const stored = useStoredTts();
  const [draftOverride, setDraftOverride] = useState<TtsOptions | null>(null);
  const [statusOverride, setStatusOverride] = useState<TtsStatus | undefined>(undefined);

  const opts: PracticeOptions = useMemo(
    () => ({ ...session, voiceURI: stored.voiceURI, tts: stored.tts }),
    [session, stored]
  );
  const ttsDraft = draftOverride ?? stored.tts;
  const ttsStatus: TtsStatus =
    statusOverride !== undefined
      ? statusOverride
      : stored.tts.provider && stored.tts.key
        ? { msg: "저장된 클라우드 음성을 사용 중입니다.", warn: false }
        : null;
  const setTtsStatus = setStatusOverride;

  const voices = useSyncExternalStore(
    subscribeVoices, getVoicesSnapshot, getVoicesServerSnapshot
  );

  /* ── 누적 결과 (원본의 state.scores / fixes / practiceWords) ── */
  const [scores, setScores] = useState<number[]>([]);
  const [fixes, setFixes] = useState<CorrectionItem[]>([]);
  const [practiceWords, setPracticeWords] = useState<Map<string, PracticeWord>>(new Map());

  /* ── 비동기 흐름용 ref ─────────────────────────── */
  const optsRef = useRef(opts);
  const sceneKeyRef = useRef<SceneKey | null>(null);
  const turnRef = useRef(0);
  const modeRef = useRef<"answer" | "shadow">("answer");
  const shadowTargetRef = useRef<string | null>(null);
  const listeningRef = useRef(false);
  const msgIdRef = useRef(0);
  const micBtnRef = useRef<HTMLButtonElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const aliveRef = useRef(true);

  const recog = useSpeechRecognition();
  const meter = useMicLevel();

  const canListen = !!recog.supported && !!recog.secure;
  const typeBarOpen = typeBarOverride ?? !canListen;
  const scene = sceneKey ? SCENES[sceneKey] : null;

  useEffect(() => { optsRef.current = opts; }, [opts]);
  useEffect(() => { listeningRef.current = recog.listening; }, [recog.listening]);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  /** 세션 옵션(속도·자동재생·해석) 변경 */
  const setOpts = useCallback((fn: (prev: PracticeOptions) => PracticeOptions) => {
    setSession(prev => {
      const next = fn({ ...prev, voiceURI: "", tts: { provider: "", key: "", voice: "" } });
      return { rate: next.rate, auto: next.auto, ko: next.ko, en: next.en };
    });
  }, []);

  /* ── 엔진 연결: 상태 메시지 · 옵션 동기화 · 정리 ── */
  useEffect(() => {
    const engine = getEngine();
    engine.onStatus = (msg, warn) => setTtsStatus({ msg, warn: !!warn });

    const onBeforeUnload = () => engine.cancel();
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      engine.onStatus = null;
      engine.cancel();
    };
  }, [setTtsStatus]);

  /* 옵션이 바뀌면 엔진에 그대로 반영합니다. */
  useEffect(() => { getEngine().setOptions(opts); }, [opts]);

  /* 서버에 TTS 키가 있는지 한 번만 확인합니다. (오디오를 만들지 않아 비용 없음) */
  useEffect(() => {
    let alive = true;
    fetch("/api/tts")
      .then(r => r.json() as Promise<{ available: boolean }>)
      .then(({ available }) => {
        if (!alive) return;
        setServerTts(available);
        getEngine().setServerTts(available);
      })
      .catch(() => { if (alive) setServerTts(false); });
    return () => { alive = false; };
  }, []);


  /* ═══════════════════════════════════════════════
     재생 · 마이크 보조
     ═══════════════════════════════════════════════ */
  const speak = useCallback(
    (text: string, o?: { slow?: boolean; onEnd?: () => void }) => {
      const key = sceneKeyRef.current;
      const lang = key ? SCENES[key].char.lang : "en-US";
      const rate = o?.slow ? 0.8 : optsRef.current.rate;
      setSpeaking(true);
      void getEngine().speak(text, {
        lang, rate,
        onEnd: () => { setSpeaking(false); o?.onEnd?.(); }
      });
    },
    []
  );

  const setMicEnabled = useCallback((on: boolean) => {
    setMicEnabledState(on);
    if (on && !listeningRef.current) setMicLive({ kind: "hint" });
  }, []);

  const pushMsg = useCallback((m: NewMsg) => {
    const id = ++msgIdRef.current;
    setMsgs(prev => [...prev, { ...m, id } as Msg]);
    return id;
  }, []);

  const addPracticeWord = useCallback((w: string, reason: string) => {
    const key = String(w).toLowerCase();
    if (!key || key.length < 2) return;
    setPracticeWords(prev => {
      const next = new Map(prev);
      const before = next.get(key);
      next.set(key, {
        word: key, count: (before?.count || 0) + 1, reason, tips: pronTips(key)
      });
      return next;
    });
  }, []);

  /* ═══════════════════════════════════════════════
     진행 로직 (practice.js §9)
     ═══════════════════════════════════════════════ */
  const finish = useCallback(() => {
    getEngine().cancel();
    setSpeaking(false);
    setMicEnabled(false);
    setHintVisible(false);
    setFinished(true);
    setReportOpen(true);
  }, [setMicEnabled]);

  const aiTurn = useCallback(
    async (key: SceneKey, idx: number) => {
      const sc = SCENES[key];
      const t = sc.turns[idx];
      if (!t) { finish(); return; }

      turnRef.current = idx;
      setTurn(idx);
      setHintVisible(false);
      setConfirm(null);
      setMicEnabled(false);

      const typingId = pushMsg({ kind: "typing" });
      await sleep(700);
      if (!aliveRef.current || sceneKeyRef.current !== key) return;
      setMsgs(prev => prev.filter(m => m.id !== typingId));

      pushMsg({ kind: "ai", ai: t.ai, ko: t.ko });
      // 새 대사가 나오면 영어 자막은 다시 접습니다 (듣기 우선)
      setRevealEn(false);
      setShowModels(false);
      setHintVisible(true);

      // 마이크는 바로 열어둡니다. (모바일 사파리처럼 TTS가 막히는 환경 대비 —
      //  말하기 버튼을 누르면 재생 중인 음성은 자동으로 멈춥니다.)
      setMicEnabled(true);
      if (optsRef.current.auto) {
        setSpeaking(true);
        void getEngine().speak(t.ai, {
          lang: sc.char.lang,
          rate: optsRef.current.rate,
          onEnd: () => setSpeaking(false)
        });
      }
    },
    [finish, pushMsg, setMicEnabled]
  );

  const startScene = useCallback(
    (key: SceneKey) => {
      sceneKeyRef.current = key;
      setSceneKey(key);
      turnRef.current = 0;
      setTurn(0);
      setScores([]);
      setFixes([]);
      setPracticeWords(new Map());
      modeRef.current = "answer";
      setMode("answer");
      shadowTargetRef.current = null;

      setScreen("stage");
      setMsgs([]);
      setSpeaking(false);
      setRevealEn(false);
      setFinished(false);
      setReportOpen(false);
      setConfirm(null);
      // 좁은 화면에서는 리포트 패널을 접어두고 '📋 리포트'로 펼칩니다
      setPanelHidden(window.innerWidth <= 1020);
      getEngine().setCharacter(SCENES[key].char);
      void aiTurn(key, 0);
    },
    [aiTurn]
  );

  /* ═══════════════════════════════════════════════
     채점 · 피드백 (practice.js §11)
     ═══════════════════════════════════════════════ */
  const gradeAnswer = useCallback(
    async (text: string, meta: SubmitMeta) => {
      const key = sceneKeyRef.current;
      if (!key) return;
      const sc = SCENES[key];
      const t = sc.turns[turnRef.current];
      if (!t) return;

      setMicEnabled(false);
      setHintVisible(false);

      const cards: AnalysisCard[] = [];

      /* (1) 발음 — 받아쓰기가 얼마나 정확했는가 */
      const heardW = toWords(meta.heard);
      const finalW = toWords(text);
      const ops = alignWords(heardW, finalW);
      const missWords = ops
        .filter(o => o.op === "sub" || o.op === "ins")
        .map(o => o.b)
        .filter((w): w is string => !!w);
      const editedCount = missWords.length;

      let score: number | null;
      if (!meta.spoken) score = null;                       // 타이핑은 발음 채점 없음
      else {
        const confScore = meta.confidence ? Math.round(meta.confidence * 100) : 82;
        const editScore = Math.max(30, 100 - editedCount * 16);
        score = Math.round(confScore * 0.45 + editScore * 0.55);
        score = Math.max(20, Math.min(99, score));
        setScores(prev => [...prev, score as number]);
      }

      if (score !== null) {
        const grade: [string, string] =
          score >= 88 ? ["😃", "아주 또렷하게 전달됐습니다"]
          : score >= 72 ? ["🙂", "대체로 잘 전달됐습니다"]
          : ["😐", "몇 군데가 뭉개져 들렸습니다"];
        cards.push({ t: "score", score, face: grade[0], note: grade[1] });
      }

      /* (2) 잘못 받아쓴 단어 → 발음 교정 */
      if (editedCount) {
        const targets = [...new Set(missWords)].slice(0, 3);
        targets.forEach(w => addPracticeWord(w, "받아쓰기를 직접 고친 단어"));
        cards.push({ t: "pron", targets });
      } else if (meta.spoken) {
        cards.push({ t: "goodDictation" });
      }

      /* (3) 표현 교정 */
      const ex = analyzeExpression(text, t);
      if (ex.items.length) {
        setFixes(prev => [...prev, ...ex.items]);
        cards.push({ t: "fix", items: ex.items });
      }
      if (ex.praises.length) cards.push({ t: "praise", praises: ex.praises });
      if (!ex.onTopic) {
        cards.push({ t: "offTopic", hint: t.hint, model: t.models[0][0] });
      }

      pushMsg({ kind: "me", text, cards });

      await sleep(900);
      if (!aliveRef.current || sceneKeyRef.current !== key) return;
      void aiTurn(key, turnRef.current + 1);
    },
    [addPracticeWord, aiTurn, pushMsg, setMicEnabled]
  );

  /** 따라 말하기 채점: 목표 문장과 단어 단위 비교 */
  const gradeShadow = useCallback(
    (text: string, meta: SubmitMeta) => {
      const target = shadowTargetRef.current;
      const key = sceneKeyRef.current;
      if (!target || !key) return;

      const T = toWords(target), H = toWords(text);
      const ops = alignWords(T, H);

      let hit = 0;
      const chips: WordChip[] = [];
      const weak: string[] = [];
      ops.forEach(o => {
        if (o.op === "match") { hit++; chips.push({ w: o.a as string, k: "ok" }); }
        else if (o.op === "sub") {
          const s = similar(o.a as string, o.b as string);
          if (s >= 0.6) { hit += 0.5; chips.push({ w: o.a as string, k: "warn" }); }
          else chips.push({ w: o.a as string, k: "bad" });
          weak.push(o.a as string);
        } else if (o.op === "del") {
          chips.push({ w: o.a as string, k: "bad" });
          weak.push(o.a as string);
        }
      });
      const score = Math.max(10, Math.min(100, Math.round((hit / Math.max(T.length, 1)) * 100)));
      if (meta.spoken) setScores(prev => [...prev, score]);

      pushMsg({ kind: "me", text, cards: [{ t: "shadow", score, target, chips, weak }] });
      weak.slice(0, 3).forEach(w => addPracticeWord(w, "따라 말하기에서 어긋난 단어"));

      // 대화 모드로 복귀
      modeRef.current = "answer";
      setMode("answer");
      shadowTargetRef.current = null;

      const cur = SCENES[key].turns[turnRef.current];
      if (cur) { setShowModels(false); setHintVisible(true); setMicEnabled(true); }
    },
    [addPracticeWord, pushMsg, setMicEnabled]
  );

  const submit = useCallback(
    (text: string, meta: SubmitMeta) => {
      if (modeRef.current === "shadow") gradeShadow(text, meta);
      else void gradeAnswer(text, meta);
    },
    [gradeAnswer, gradeShadow]
  );

  /* ═══════════════════════════════════════════════
     듣기 (practice.js §10)
     ═══════════════════════════════════════════════ */
  const startListening = useCallback(() => {
    if (!canListen) { setTypeBarOverride(true); return; }
    if (listeningRef.current) { recog.stop(); return; }
    const key = sceneKeyRef.current;
    if (!key) return;

    recog.start(SCENES[key].char.lang, {
      onStart: () => {
        setMicLive({ kind: "interim", text: "…" });
        void meter.start();
      },
      onInterim: text => setMicLive({ kind: "interim", text }),
      onError: code => {
        meter.stop();
        setMicLive({ kind: "error", msg: ERROR_MESSAGES[code] || "인식에 실패했습니다." });
      },
      onDone: ({ text, confidence, alts }) => {
        meter.stop();
        if (!text) return;
        // 따라 말하기는 '인식된 그대로'가 채점 기준이므로 수정 단계를 거치지 않습니다.
        if (modeRef.current === "shadow") submit(text, { heard: text, confidence, spoken: true });
        else setConfirm({ original: text, text, confidence, alts });
      }
    });
  }, [canListen, meter, recog, submit]);

  const onMic = useCallback(() => {
    if (!micEnabled) return;
    getEngine().cancel();
    setSpeaking(false);
    startListening();
  }, [micEnabled, startListening]);

  /* 새 내용이 오면 아래(피드백)로 스크롤합니다.
     캐릭터 대사는 sticky 라 스크롤해도 위에 그대로 남습니다. */
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  /* 스페이스바로 마이크 토글 (입력 중이 아닐 때) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || screen !== "stage") return;
      const el = e.target as HTMLElement | null;
      if (el && /input|textarea/i.test(el.tagName)) return;
      e.preventDefault();
      micBtnRef.current?.click();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [screen]);

  /* ═══════════════════════════════════════════════
     도구 버튼 (🔊 듣기 / 🎯 따라 말하기)
     ═══════════════════════════════════════════════ */
  const shadow = useCallback(
    (text: string) => {
      modeRef.current = "shadow";
      setMode("shadow");
      shadowTargetRef.current = text;
      setConfirm(null);
      setMicLive({ kind: "target", text });
      // 원본과 동일한 호출 순서 — setMicEnabled 가 곧바로 기본 안내로 덮어씁니다.
      setMicEnabled(true);
      micBtnRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const key = sceneKeyRef.current;
      void getEngine().speak(text, {
        lang: key ? SCENES[key].char.lang : "en-US",
        rate: 0.85
      });
    },
    [setMicEnabled]
  );

  /* ═══════════════════════════════════════════════
     음성 설정 핸들러
     ═══════════════════════════════════════════════ */
  const onVoiceChange = useCallback((voiceURI: string) => {
    const next = { voiceURI, tts: optsRef.current.tts };
    writeStoredTts(next);
    getEngine().setOptions({ ...optsRef.current, ...next });
    void getEngine().speak(SAMPLE, { lang: "en-US", profile: {} });
  }, []);

  const onVoiceTest = useCallback(() => {
    void getEngine().speak(SAMPLE, { lang: "en-US", profile: {} });
  }, []);

  const onTtsSave = useCallback(async () => {
    const next: TtsOptions = {
      provider: ttsDraft.provider,
      key: ttsDraft.key.trim(),
      voice: ttsDraft.voice.trim()
    };
    writeStoredTts({ voiceURI: optsRef.current.voiceURI, tts: next });
    getEngine().setOptions({ ...optsRef.current, tts: next });

    if (!next.provider) {
      setTtsStatus({ msg: "브라우저 내장 음성을 사용합니다.", warn: false });
      void getEngine().speak(SAMPLE, { lang: "en-US", profile: {} });
      return;
    }
    if (!next.key) {
      setTtsStatus({ msg: "API 키를 입력해 주세요.", warn: true });
      return;
    }
    setTtsStatus({ msg: "음성을 만드는 중…", warn: false });
    try {
      await getEngine().playCloudSample(SAMPLE, { oa: "nova" });
      setTtsStatus({
        msg: "✅ 연결됐습니다. 이제 사람 목소리에 가까운 음성으로 읽어줍니다.",
        warn: false
      });
    } catch (e) {
      setTtsStatus({
        msg: "⚠️ 실패: " + (e as Error).message + " — 키와 잔액을 확인해 주세요.",
        warn: true
      });
    }
  }, [setTtsStatus, ttsDraft]);

  const onTtsClear = useCallback(() => {
    const next: TtsOptions = { provider: "", key: "", voice: "" };
    setDraftOverride(next);
    getEngine().clearCache();
    writeStoredTts({ voiceURI: optsRef.current.voiceURI, tts: next });
    getEngine().setOptions({ ...optsRef.current, tts: next });
    setTtsStatus({ msg: "키를 삭제했습니다. 브라우저 내장 음성을 사용합니다.", warn: false });
  }, [setTtsStatus]);

  /* ═══════════════════════════════════════════════
     화면 전환
     ═══════════════════════════════════════════════ */
  const toSetup = useCallback(() => {
    getEngine().cancel();
    setSpeaking(false);
    recog.stop();
    sceneKeyRef.current = null;
    setScreen("setup");
    setReportOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [recog]);

  /* ═══════════════════════════════════════════════
     파생 값
     ═══════════════════════════════════════════════ */
  const total = scene ? scene.turns.length : 0;
  const progressPct = finished ? 100 : total ? (turn / total) * 100 : 0;
  const progressText = total ? `${Math.min(turn + 1, total)} / ${total}` : "0 / 0";

  const avg = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
  const wordList = [...practiceWords.values()].sort((a, b) => b.count - a.count);
  const currentTurn = scene ? scene.turns[turn] : null;

  /* 무대에 세울 값 — 메시지 기록에서 그대로 끌어옵니다. */
  const thinking = msgs.some(m => m.kind === "typing");
  const lastAi = [...msgs].reverse().find(m => m.kind === "ai") ?? null;
  const lastMe = [...msgs].reverse().find(m => m.kind === "me") ?? null;
  const showEn = opts.en || revealEn;

  /** 자막 숨기기 — 이번 턴 펼침과 '항상 보기' 설정을 모두 끕니다. */
  const hideEn = () => {
    setRevealEn(false);
    if (opts.en) setOpts(p => ({ ...p, en: false }));
  };

  return (
    <ToolsContext.Provider value={{ speak, shadow, playingId, setPlayingId }}>
      <div className="practice-page">
        <TopBar
          avatar={scene?.char.emoji ?? "👩‍✈️"}
          name={scene?.char.name ?? "Emma"}
          scene={scene?.title ?? "공항 체크인"}
          onSetup={toSetup}
          onPanel={() => setPanelHidden(h => !h)}
        />

        <Warnings supported={recog.supported} secure={recog.secure} />

        {screen === "setup" ? (
          <SetupScreen
            opts={opts}
            setOpts={setOpts}
            voices={voices}
            onPick={startScene}
            onVoiceChange={onVoiceChange}
            onVoiceTest={onVoiceTest}
            ttsDraft={ttsDraft}
            setTtsDraft={fn => setDraftOverride(p => fn(p ?? stored.tts))}
            onTtsSave={() => void onTtsSave()}
            onTtsClear={onTtsClear}
            ttsStatus={ttsStatus}
            serverTts={serverTts}
          />
        ) : (
          <main className="stage" id="stage">
            <section className="talk">
              <div className="talk__progress">
                <div className="talk__progress-bar">
                  <i id="progBar" style={{ width: `${progressPct}%` }} />
                </div>
                <span id="progText">{progressText}</span>
              </div>

              <div className="talk__main" ref={mainRef}>
                {scene ? (
                  <CharacterStage
                    char={scene.char}
                    line={lastAi ? { ai: lastAi.ai, ko: lastAi.ko } : null}
                    thinking={thinking}
                    speaking={speaking}
                    showEn={showEn}
                    showKo={opts.ko}
                    onRevealEn={() => setRevealEn(true)}
                    onHideEn={hideEn}
                    onToggleKo={() => setOpts(p => ({ ...p, ko: !p.ko }))}
                  />
                ) : null}

                {lastMe ? <FeedbackStrip text={lastMe.text} cards={lastMe.cards} /> : null}
              </div>

              {hintVisible && currentTurn ? (
                <Hint
                  turn={currentTurn}
                  showModels={showModels}
                  onToggleModels={() => setShowModels(v => !v)}
                />
              ) : null}

              {confirm ? (
                <ConfirmBar
                  state={confirm}
                  onChange={text => setConfirm(c => (c ? { ...c, text } : c))}
                  onSend={() => {
                    const text = confirm.text.trim();
                    if (!text) return;
                    setConfirm(null);
                    submit(text, {
                      heard: confirm.original,
                      confidence: confirm.confidence,
                      spoken: true
                    });
                  }}
                  onRetry={() => { setConfirm(null); startListening(); }}
                />
              ) : null}

              <MicBar
                live={micLive}
                listening={recog.listening}
                enabled={micEnabled}
                mode={mode}
                canListen={canListen}
                levels={meter.levels}
                meterLive={meter.live}
                typeBarOpen={typeBarOpen}
                onMic={onMic}
                onToggleType={() => setTypeBarOverride(v => !(v ?? !canListen))}
                onType={text => submit(text, { heard: text, confidence: 0, spoken: false })}
                micBtnRef={micBtnRef}
              />

              <TranscriptLog
                msgs={msgs}
                avatar={scene?.char.emoji ?? ""}
                showKo={opts.ko}
                onToggleKo={() => setOpts(p => ({ ...p, ko: !p.ko }))}
              />
            </section>

            <SidePanel
              hidden={panelHidden}
              avg={avg}
              scoreCount={scores.length}
              words={wordList}
              fixes={fixes}
              onRestart={() => { if (sceneKey) startScene(sceneKey); }}
            />
          </main>
        )}

        {reportOpen && scene ? (
          <ReportModal
            title={scene.done}
            avg={avg === null ? "–" : avg}
            turns={scores.length}
            words={wordList}
            fixes={fixes}
            onClose={() => setReportOpen(false)}
            onAgain={() => { setReportOpen(false); if (sceneKey) startScene(sceneKey); }}
            onOther={() => { setReportOpen(false); toSetup(); }}
          />
        ) : null}
      </div>
    </ToolsContext.Provider>
  );
}
