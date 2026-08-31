"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { SCENES, SCENE_KEYS } from "@/lib/data/scenarios";
import { analyzeExpression } from "@/lib/correction/expression";
import { pronTips } from "@/lib/correction/pronunciation";
import { alignWords, similar, words as toWords } from "@/lib/correction/textDiff";
import { sleep } from "@/lib/hooks/useSleep";
import { getEngine } from "@/lib/speech/engine";
import { useStoredTts, writeStoredTts } from "@/lib/speech/ttsStore";
import { useFreeTrial } from "@/lib/practice/freeTrial";
import { useMicLevel } from "@/lib/speech/useMicLevel";
import { ERROR_MESSAGES, useSpeechRecognition } from "@/lib/speech/useSpeechRecognition";
import type {
  CorrectionItem, PracticeOptions, PracticeWord, SceneKey
} from "@/types/practice";

import type { AnalysisCard, WordChip } from "./cards";
import { CharacterStage } from "./CharacterStage";
import { type Msg, type NewMsg } from "./ChatView";
import { FeedbackStrip } from "./FeedbackStrip";
import { TranscriptLog } from "./TranscriptLog";
import { ConfirmBar, type ConfirmState } from "./ConfirmBar";
import { Hint } from "./Hint";
import { LoginGate } from "./LoginGate";
import { MicBar, type MicLive } from "./MicBar";
import { ReportModal } from "./ReportModal";
import { SetupScreen } from "./SetupScreen";
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
  /** 무료 횟수를 다 쓴 방문자에게 띄우는 로그인 안내 */
  const [gateOpen, setGateOpen] = useState(false);
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

  const opts: PracticeOptions = useMemo(
    () => ({ ...session, voiceURI: stored.voiceURI, tts: stored.tts }),
    [session, stored]
  );

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
  /** 마이크를 여는 예약. 두 번 눌러 두 개가 겹치지 않게 합니다. */
  const micTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 한 번 끝낸 연습을 두 번 저장하지 않도록 */
  const savedRef = useRef(false);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const aliveRef = useRef(true);

  const recog = useSpeechRecognition();
  const meter = useMicLevel();

  /* 비로그인 무료 횟수. 세션 확인이 끝나기 전에는 아무도 막지 않습니다. */
  const trial = useFreeTrial();
  const { locked: trialLocked, reason: trialReason, consume: consumeTrial } = trial;

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

  /* ── 엔진 연결: 옵션 동기화 · 정리 ── */
  useEffect(() => {
    const engine = getEngine();
    const onBeforeUnload = () => engine.cancel();
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      engine.cancel();
    };
  }, []);

  /* 옵션이 바뀌면 엔진에 그대로 반영합니다. */
  useEffect(() => { getEngine().setOptions(opts); }, [opts]);

  /* 미리 구워둔 대사 목록을 한 번만 읽습니다.
   * 연습실 대본은 고정이라 대사 대부분이 여기 있고, 있으면 API 를 부르지 않습니다.
   * 파일이 없으면(아직 안 구웠으면) 조용히 넘어가 서버 TTS·내장 음성으로 갑니다. */
  useEffect(() => {
    let alive = true;
    fetch("/tts/manifest.json")
      .then(r => (r.ok ? (r.json() as Promise<Record<string, string>>) : null))
      .then(map => { if (alive && map) getEngine().setPrerendered(map); })
      .catch(() => { /* 없으면 그만 — 아래 경로로 재생됩니다 */ });
    return () => { alive = false; };
  }, []);

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

  /* 예전 버전에서 개인 API 키를 저장해 둔 브라우저가 있습니다. 그 설정 화면은
   * 사라졌으니, 지울 방법이 없는 키를 남겨두지 않고 한 번 비웁니다. */
  useEffect(() => {
    if (!stored.tts.provider && !stored.tts.key) return;
    writeStoredTts({
      voiceURI: stored.voiceURI,
      tts: { provider: "", key: "", voice: "" }
    });
  }, [stored]);


  /* ═══════════════════════════════════════════════
     재생 · 마이크 보조
     ═══════════════════════════════════════════════ */
  /**
   * 🔊 다시 듣기 · 천천히 · 모범 문장 재생.
   *
   * **앱이 소리를 내기 전에 열린 마이크를 닫습니다.** 닫지 않으면 인식기가 그 소리를
   * 사용자의 말로 받아쓰고, 그대로 답변으로 확정돼 버립니다. 사용자 입장에서는
   * "녹음을 켜고 재생을 눌렀더니 입력이 안 된다" 로 보입니다.
   */
  const speak = useCallback(
    (text: string, o?: { slow?: boolean; onEnd?: () => void }) => {
      if (listeningRef.current) recog.stop();
      const key = sceneKeyRef.current;
      const lang = key ? SCENES[key].char.lang : "en-US";
      const rate = o?.slow ? 0.8 : optsRef.current.rate;
      setSpeaking(true);
      void getEngine().speak(text, {
        lang, rate,
        onEnd: () => { setSpeaking(false); o?.onEnd?.(); }
      });
    },
    [recog]
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
  /**
   * 마지막 답변에 대한 캐릭터의 맺음말.
   *
   * 예전에는 마지막 턴을 채점하자마자 리포트를 열어서, 대화가 사용자의 말에서
   * 끊기고 캐릭터는 대꾸 한 번 없이 사라졌습니다. 실제 대화라면 상대가 마지막
   * 말을 받아줍니다. 맺음말을 들려준 **뒤에** 리포트를 엽니다 — 바로 열면 방금
   * 나온 대사를 모달이 덮어버립니다.
   */
  const closingTurn = useCallback(
    async (key: SceneKey) => {
      const sc = SCENES[key];
      setMicEnabled(false);
      setHintVisible(false);
      setConfirm(null);

      const typingId = pushMsg({ kind: "typing" });
      await sleep(700);
      if (!aliveRef.current || sceneKeyRef.current !== key) return;
      setMsgs(prev => prev.filter(m => m.id !== typingId));

      pushMsg({ kind: "ai", ai: sc.closing.ai, ko: sc.closing.ko });
      setRevealEn(false);
      setShowModels(false);
      setFinished(true);            // 진행바 100%

      if (listeningRef.current) recog.stop();   // 위와 같은 이유
      if (optsRef.current.auto) {
        setSpeaking(true);
        // 음성이 막힌 환경(자동재생 차단 등)에서도 리포트가 열리도록 시간 제한을 둡니다.
        await new Promise<void>(resolve => {
          let settled = false;
          const once = () => { if (!settled) { settled = true; resolve(); } };
          const guard = setTimeout(once, 9000);
          void getEngine().speak(sc.closing.ai, {
            lang: sc.char.lang,
            rate: optsRef.current.rate,
            onEnd: () => { clearTimeout(guard); once(); }
          });
        });
      } else {
        await sleep(2400);          // 자동 재생을 꺼 뒀다면 읽을 시간을 줍니다
      }

      if (!aliveRef.current || sceneKeyRef.current !== key) return;
      setSpeaking(false);
      setReportOpen(true);
    },
    [pushMsg, recog, setMicEnabled]
  );

  const aiTurn = useCallback(
    async (key: SceneKey, idx: number) => {
      const sc = SCENES[key];
      const t = sc.turns[idx];
      if (!t) { void closingTurn(key); return; }

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

      /* 지난 턴의 인식이 아직 돌고 있으면 먼저 닫습니다.
         열린 마이크에 대고 캐릭터 대사를 재생하면 **인식기가 그 소리를 받아씁니다** —
         사용자가 말하지 않았는데 대사가 그대로 답변으로 잡히는 일이 실제로 있었습니다. */
      if (listeningRef.current) recog.stop();
      setMicLive({ kind: "hint" });   // 지난 턴의 중간 결과가 남아 있지 않게

      if (optsRef.current.auto) {
        setSpeaking(true);
        void getEngine().speak(t.ai, {
          lang: sc.char.lang,
          rate: optsRef.current.rate,
          onEnd: () => setSpeaking(false)
        });
      }
    },
    [closingTurn, pushMsg, recog, setMicEnabled]
  );

  const startScene = useCallback(
    (key: SceneKey) => {
      // 무료 횟수를 다 썼으면 시작하지 않고 로그인 안내만 띄웁니다.
      if (trialLocked) { setGateOpen(true); return; }
      consumeTrial();

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

      savedRef.current = false;
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
    [aiTurn, consumeTrial, trialLocked]
  );

  /* 랜딩 페이지의 캐릭터·상황 카드에서 `/practice?scene=hotel` 로 들어옵니다.
   * 고른 상황이 이미 정해져 있으니 선택 화면을 한 번 더 거치게 하지 않습니다.
   * 무료 횟수 판정이 끝난 뒤에 시작해야 다섯 번을 넘겨 세지 않습니다. */
  const searchParams = useSearchParams();
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (autoStartedRef.current || !trial.ready) return;
    const asked = searchParams.get("scene");
    if (!asked || !SCENE_KEYS.includes(asked as SceneKey)) return;
    autoStartedRef.current = true;   // 연습실 안에서 되돌아와도 다시 시작하지 않게

    // 첫 화면이 그려진 뒤에 시작합니다 — 카드를 눌러 들어왔을 때와 같은 순서로
    // 대사·타이핑 애니메이션이 돌게 하려는 것입니다.
    const id = setTimeout(() => startScene(asked as SceneKey), 0);
    return () => clearTimeout(id);
  }, [searchParams, startScene, trial.ready]);

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
    if (listeningRef.current) { startListening(); return; }   // 듣는 중이면 멈추는 동작
    if (micTimerRef.current) return;                          // 이미 열리는 중이면 겹쳐 열지 않습니다

    /* 재생 중인 음성을 멈추고 **잠깐 기다린 뒤** 마이크를 엽니다.
       cancel() 직후에도 스피커에서 소리 꼬리가 남는 기기가 있고, 그 꼬리를 인식기가
       사용자의 말로 받아씁니다. 200ms 는 사람이 버튼을 누르고 입을 떼는 시간보다
       짧아 체감되지 않습니다. */
    getEngine().cancel();
    setSpeaking(false);
    setMicLive({ kind: "hint" });
    micTimerRef.current = setTimeout(() => {
      micTimerRef.current = null;
      if (aliveRef.current) startListening();
    }, 200);
  }, [micEnabled, startListening]);

  /* 연습이 끝나면 기록을 남깁니다.
     로그인 여부는 **서버가 쿠키로 판단**합니다 — 화면이 정하면 남의 것으로 저장할
     길이 생깁니다. 저장에 실패해도 알리지 않습니다. 연습은 이미 끝났고, 리포트는
     화면에 그대로 있으며, "저장 실패" 를 띄워서 사용자가 할 수 있는 일이 없습니다. */
  useEffect(() => {
    if (!finished || savedRef.current) return;
    const key = sceneKeyRef.current;
    if (!key) return;
    savedRef.current = true;

    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    void fetch("/api/practice/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sceneKey: key,
        turns: msgs.filter(m => m.kind === "me").length,
        avgScore: avg,
        scores,
        corrections: fixes,
        words: [...practiceWords.values()]
      })
    }).catch(() => { /* 저장 실패는 화면을 막지 않습니다 */ });
  }, [finished, fixes, msgs, practiceWords, scores]);

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
      if (listeningRef.current) recog.stop();   // 재생 전에 마이크를 닫습니다 (speak 주석 참고)
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
    [recog, setMicEnabled]
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
          panelHidden={panelHidden}
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
            serverTts={serverTts}
            trial={trial}
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
                finished={finished}
                onReport={() => setReportOpen(true)}
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

        {gateOpen && trialReason ? <LoginGate reason={trialReason} onClose={() => setGateOpen(false)} /> : null}

        {reportOpen && scene ? (
          <ReportModal
            title={scene.done}
            sceneKey={sceneKey}
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
