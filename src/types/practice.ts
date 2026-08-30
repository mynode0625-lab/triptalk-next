/** 캐릭터 음성 프로필 — 클라우드 TTS 와 내장 음성 양쪽에서 씁니다. */
export type VoiceProfile = {
  /** OpenAI 음성 이름 */
  oa?: string;
  /** ElevenLabs 음성 ID */
  el?: string;
  rate?: number;
  pitch?: number;
  /** OpenAI gpt-4o-mini-tts 의 instructions */
  inst?: string;
};

export type SceneCharacter = {
  name: string;
  emoji: string;
  role: string;
  lang: string;
  voice: VoiceProfile;
};

export type SceneTurn = {
  ai: string;
  ko: string;
  hint: string;
  /** [영어 모범 문장, 한국어 해석] */
  models: [string, string][];
  keys: string[];
};

export type Scene = {
  title: string;
  emoji: string;
  lv: string;
  char: SceneCharacter;
  desc: string;
  turns: SceneTurn[];
  /** 마지막 답변에 대한 캐릭터의 맺음말. 대화가 사용자 차례에서 끊기지 않게 합니다. */
  closing: { ai: string; ko: string };
  done: string;
};

export type SceneKey =
  /* 🗣 기본 표현 — 상황별 표현보다 먼저 필요한 것들 (되묻기·숫자·인사·부탁) */
  | "askagain" | "numbers" | "greeting" | "askhelp"
  | "checkin" | "immigration" | "hotel" | "restaurant" | "taxi"
  /* 🛍 쇼핑 — 책들이 독립된 장으로 두는 구간 */
  | "fitting" | "checkout" | "refund"
  /* 💳 돈 트랙 — 여행영어 책들이 여러 장에 흩어 놓는 금융 상황을 모은 묶음 */
  | "carddecline" | "atm" | "exchange" | "taxrefund" | "lostcard";

export type CorrectionItem = { from: string; to: string; why: string };

export type ExpressionResult = {
  items: CorrectionItem[];
  praises: string[];
  onTopic: boolean;
};

export type PracticeWord = {
  word: string;
  count: number;
  reason: string;
  tips: string[];
};

export type AlignOp = {
  op: "match" | "sub" | "del" | "ins";
  a: string | null;
  b: string | null;
};

export type TtsOptions = {
  provider: "" | "openai" | "eleven";
  key: string;
  voice: string;
};

export type PracticeOptions = {
  rate: number;
  auto: boolean;
  /** 한글 해석 표시 — 기본은 꺼짐(듣기 우선) */
  ko: boolean;
  /** 영어 자막 항상 보기 — 기본은 꺼짐(듣기 우선) */
  en: boolean;
  voiceURI: string;
  tts: TtsOptions;
};
