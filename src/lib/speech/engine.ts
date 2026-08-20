/**
 * TTS 엔진 — practice.js §5 이식
 *
 * · 브라우저 내장 음성(speechSynthesis) + 선택적 클라우드 음성(OpenAI / ElevenLabs)
 * · 브라우저 API 는 서버에 없으므로 이 모듈의 인스턴스는 반드시
 *   `getEngine()` 을 통해 클라이언트에서만 생성합니다.
 */
import type { SceneCharacter, PracticeOptions, VoiceProfile } from "@/types/practice";

/* 로봇처럼 들리는 macOS 노벨티/저품질 음성 — 튜터 목소리에서 제외 */
export const BAD_VOICE = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|jester|junior|organ|ralph|superstar|trinoids|whisper|wobble|zarvox|hysterical|princess|kathy|fred|grandma|grandpa|rocko|shelley|sandy|flo|eddy|reed/i;
/* 자연스러운 편인 음성 (OS·브라우저별) */
export const GOOD_VOICE = /google|natural|neural|premium|enhanced|siri|samantha|ava|allison|serena|daniel|karen|moira|tessa|aria|jenny|guy|libby|sonia/i;
/**
 * 사람에 가깝게 들리는 고품질 음성.
 * macOS·iOS 는 시스템 언어에 따라 "(Enhanced)" 가 "(향상됨)" / "(프리미엄)" 으로 표기되므로
 * 한국어 라벨도 함께 인식합니다. (이게 빠지면 한글 macOS 에서 애써 설치한
 *  고품질 음성이 기본 음성과 같은 점수를 받아 선택되지 않습니다.)
 */
export const PREMIUM_VOICE = /natural|neural|premium|enhanced|향상|프리미엄|고급/i;
/** 미국식 영어로 특히 자연스러운 음성 이름 */
export const NATURAL_US = /google us english|samantha|ava|allison|nicky|noelle|aria|jenny|guy|zira|mark/i;

export type SpeakOptions = {
  lang?: string;
  rate?: number;
  profile?: VoiceProfile;
  onEnd?: () => void;
};

const DEFAULT_OPTS: PracticeOptions = {
  rate: 1, auto: true, ko: false, en: false, voiceURI: "",
  tts: { provider: "", key: "", voice: "" }
};

export class SpeechEngine {
  private synth: SpeechSynthesis | null;
  private voices: SpeechSynthesisVoice[] = [];
  private opts: PracticeOptions = DEFAULT_OPTS;
  private char: SceneCharacter | null = null;

  private speakTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAlive: ReturnType<typeof setInterval> | null = null;

  private audioCache = new Map<string, string>();
  private curAudio: HTMLAudioElement | null = null;
  /** 서버 TTS 사용 가능 여부 — null: 아직 확인 전, false: 서버에 키 없음 */
  private serverTts: boolean | null = null;

  private voiceListeners = new Set<() => void>();
  /** useSyncExternalStore 용 캐시 — 같은 목록이면 같은 배열 참조를 돌려줍니다. */
  private englishCache: SpeechSynthesisVoice[] = [];
  private englishCacheFor: SpeechSynthesisVoice[] | null = null;
  /** 클라우드 음성 실패 등 상태 메시지 */
  onStatus: ((msg: string, warn?: boolean) => void) | null = null;

  constructor() {
    this.synth = typeof window !== "undefined" ? window.speechSynthesis ?? null : null;
    if (this.synth) {
      this.loadVoices();
      this.synth.addEventListener("voiceschanged", this.loadVoices);
    }
  }

  /* ── 옵션 ─────────────────────────────────────── */
  setOptions(opts: PracticeOptions) { this.opts = opts; }
  setCharacter(char: SceneCharacter | null) { this.char = char; }
  /** `/api/tts` 가용 여부를 미리 알려주면 헛된 요청을 한 번 아낍니다. */
  setServerTts(available: boolean) { this.serverTts = available; }

  /* ── 보이스 목록 ──────────────────────────────── */
  private loadVoices = () => {
    this.voices = this.synth ? this.synth.getVoices() : [];
    this.voiceListeners.forEach(fn => fn());
  };

  /** 보이스 목록 변경 구독. 해제 함수를 돌려줍니다. */
  subscribeVoices(fn: () => void): () => void {
    this.voiceListeners.add(fn);
    return () => { this.voiceListeners.delete(fn); };
  }

  /** 영어 음성 목록 스냅숏 (참조 안정) */
  getEnglishVoicesSnapshot(): SpeechSynthesisVoice[] {
    if (this.englishCacheFor !== this.voices) {
      this.englishCacheFor = this.voices;
      this.englishCache = this.englishVoices("en-US");
    }
    return this.englishCache;
  }

  rankVoice(v: SpeechSynthesisVoice, lang: string): number {
    const vl = (v.lang || "").replace("_", "-").toLowerCase();
    const want = lang.toLowerCase();
    let s = 0;
    // 같은 지역(en-US↔en-US)을 다른 영어권(en-GB/AU/IN)보다 확실히 앞세웁니다.
    // 격차가 좁으면 미국식 상황에서 영국·호주·인도 억양이 뽑히는 일이 생깁니다.
    if (vl === want) s += 140;
    else if (vl.startsWith(want.slice(0, 2))) s += 40;
    else return -999;                       // 영어가 아니면 후보에서 제외
    if (GOOD_VOICE.test(v.name)) s += 45;
    if (NATURAL_US.test(v.name)) s += 30;
    if (/google/i.test(v.name)) s += 25;    // Chrome 의 네트워크 음성이 가장 매끄럽습니다
    if (PREMIUM_VOICE.test(v.name)) s += 60; // 설치형 고품질 음성이 있으면 무조건 우선
    if (!v.localService) s += 12;
    if (/compact/i.test(v.name)) s -= 30;
    if (BAD_VOICE.test(v.name)) s -= 200;
    return s;
  }

  /**
   * 지금 기기에 사람처럼 들리는 음성이 하나라도 있는지.
   * 없으면 설정 화면에서 고품질 음성 설치를 안내합니다.
   */
  hasNaturalVoice(lang = "en-US"): boolean {
    return this.englishVoices(lang).some(
      v => PREMIUM_VOICE.test(v.name) || /google/i.test(v.name) || !v.localService
    );
  }

  englishVoices(lang: string): SpeechSynthesisVoice[] {
    return this.voices
      .map(v => ({ v, s: this.rankVoice(v, lang) }))
      .filter(o => o.s > -100)
      .sort((a, b) => b.s - a.s)
      .map(o => o.v);
  }

  private pickVoice(lang: string): SpeechSynthesisVoice | null {
    if (!this.voices.length) this.voices = this.synth ? this.synth.getVoices() : [];
    if (this.opts.voiceURI) {
      const chosen = this.voices.find(v => v.voiceURI === this.opts.voiceURI);
      if (chosen) return chosen;
    }
    return this.englishVoices(lang)[0] || null;
  }

  /* ── 브라우저 내장 음성 재생 ─────────────────────
     Chrome 에는 cancel() 직후 speak() 하면 첫 단어가 끊기거나
     단어 단위로 뚝뚝 끊겨 들리는 버그가 있습니다.
     한 박자 쉬고 재생하고, 긴 문장에서 멈추는 현상도 함께 막습니다. */
  private sysSpeak(text: string, { lang = "en-US", rate = 1, profile = {}, onEnd }: SpeakOptions = {}) {
    const synth = this.synth;
    if (!synth) { onEnd?.(); return; }
    if (this.speakTimer) clearTimeout(this.speakTimer);
    if (this.keepAlive) clearInterval(this.keepAlive);
    synth.cancel();

    this.speakTimer = setTimeout(() => {
      const u = new SpeechSynthesisUtterance(String(text).trim());
      u.lang = lang;
      // 0.7 아래로 내려가면 대부분의 음성이 단어 단위로 끊깁니다
      u.rate = Math.max(0.72, Math.min(1.3, rate * (profile.rate || 1)));
      u.pitch = profile.pitch || 1;
      u.volume = 1;
      const v = this.pickVoice(lang);
      if (v) { u.voice = v; u.lang = v.lang; }
      u.onend = u.onerror = () => {
        if (this.keepAlive) clearInterval(this.keepAlive);
        onEnd?.();
      };
      synth.speak(u);
      this.keepAlive = setInterval(() => {
        if (!synth.speaking) { if (this.keepAlive) clearInterval(this.keepAlive); return; }
        synth.pause(); synth.resume();   // Chrome 이 중간에 멈추는 것 방지
      }, 9000);
    }, 110);
  }

  /* ── 클라우드 음성 (선택) ────────────────────────
     API 키가 있으면 사람 목소리에 가까운 음성으로 읽어줍니다.
     키는 이 브라우저에만 저장되고 해당 업체로만 전송됩니다. */
  async cloudAudio(text: string, profile: VoiceProfile): Promise<string> {
    const { provider, key, voice } = this.opts.tts;
    const vid = voice || (provider === "openai" ? (profile.oa || "nova") : (profile.el || "EXAVITQu4vr4xnSDxMaL"));
    const ck = `${provider}|${vid}|${text}`;
    const hit = this.audioCache.get(ck);
    if (hit) return hit;

    let res: Response;
    if (provider === "openai") {
      res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts", voice: vid, input: text,
          instructions: profile.inst || "Speak naturally, like a real person in conversation.",
          response_format: "mp3"
        })
      });
    } else {
      res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vid)}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": key },
        body: JSON.stringify({
          text, model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true }
        })
      });
    }
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
    const url = URL.createObjectURL(await res.blob());
    this.audioCache.set(ck, url);
    return url;
  }

  /**
   * 서버 TTS(`/api/tts`). 서버에 키가 없으면 501 이 오고, 그때는 다시 시도하지 않습니다.
   * 사용자가 자기 키를 넣지 않아도 사람에 가까운 미국식 발음을 쓸 수 있게 하는 경로입니다.
   */
  private async serverAudio(text: string, profile: VoiceProfile): Promise<string> {
    const voice = profile.oa || "nova";
    const ck = `server|${voice}|${text}`;
    const hit = this.audioCache.get(ck);
    if (hit) return hit;

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, instructions: profile.inst })
    });

    if (res.status === 501) {
      this.serverTts = false;              // 서버에 키가 없음 — 앞으로 건너뜁니다
      throw new Error("server-tts-unavailable");
    }
    if (!res.ok) throw new Error(`${res.status}`);

    this.serverTts = true;
    const url = URL.createObjectURL(await res.blob());
    this.audioCache.set(ck, url);
    return url;
  }

  /** blob URL 을 재생합니다. (클라우드·서버 음성 공통) */
  private async playUrl(url: string, rate: number, onEnd?: () => void) {
    const a = new Audio(url);
    this.curAudio = a;
    a.playbackRate = Math.max(0.6, Math.min(1.5, rate));
    a.onended = () => { if (this.curAudio === a) this.curAudio = null; onEnd?.(); };
    await a.play();
  }

  stopAudio() {
    if (this.curAudio) {
      this.curAudio.pause();
      this.curAudio.onended = null;
      this.curAudio = null;
    }
  }

  /** 캐시된 blob URL 을 해제합니다. (키 삭제 / 언마운트) */
  clearCache() {
    this.audioCache.forEach(url => URL.revokeObjectURL(url));
    this.audioCache.clear();
  }

  cancel() {
    this.stopAudio();
    if (this.speakTimer) clearTimeout(this.speakTimer);
    if (this.keepAlive) clearInterval(this.keepAlive);
    this.synth?.cancel();
  }

  /**
   * 모든 재생은 이 함수를 통합니다. 자연스러운 순서로 내려갑니다.
   *   1. 사용자가 직접 넣은 클라우드 키 (OpenAI / ElevenLabs)
   *   2. 서버 TTS (`/api/tts`) — 서버에 키가 있을 때
   *   3. 브라우저 내장 음성
   */
  async speak(text: string, { lang, rate, profile, onEnd }: SpeakOptions = {}) {
    this.stopAudio();
    const prof = profile || this.char?.voice || {};
    const lg = lang || this.char?.lang || "en-US";
    const r = rate || this.opts.rate;
    const body = String(text).trim();

    /* 1. 사용자 개인 키 */
    if (this.opts.tts.provider && this.opts.tts.key) {
      try {
        this.synth?.cancel();
        await this.playUrl(await this.cloudAudio(body, prof), r, onEnd);
        return;
      } catch (e) {
        this.onStatus?.("⚠️ 클라우드 음성 실패 — 내장 음성으로 재생합니다. (" + (e as Error).message + ")", true);
      }
    }

    /* 2. 서버 TTS */
    if (this.serverTts !== false) {
      try {
        this.synth?.cancel();
        await this.playUrl(await this.serverAudio(body, prof), r, onEnd);
        return;
      } catch {
        /* 서버에 키가 없거나 일시적 실패 — 내장 음성으로 넘어갑니다 */
      }
    }

    /* 3. 브라우저 내장 음성 */
    this.sysSpeak(text, { lang: lg, rate: r, profile: prof, onEnd });
  }

  /** 직접 재생 (테스트 버튼) — 클라우드 전용, 실패는 호출자가 처리 */
  async playCloudSample(text: string, profile: VoiceProfile) {
    const url = await this.cloudAudio(text, profile);
    this.stopAudio();
    const a = new Audio(url);
    this.curAudio = a;
    await a.play();
  }
}

let engine: SpeechEngine | null = null;

/** 브라우저에서만 호출하세요. (useEffect / 이벤트 핸들러 내부) */
export function getEngine(): SpeechEngine {
  if (!engine) engine = new SpeechEngine();
  return engine;
}
