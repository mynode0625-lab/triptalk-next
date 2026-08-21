import type { SceneKey } from "./practice";

export type Character = {
  emoji: string;
  name: string;
  role: string;
  desc: string;
  tags: string[];
  line: string;
  ko: string;
};

export type SituationKey = "basics" | "airport" | "hotel" | "food" | "city" | "trouble";

export type Situation = {
  emoji: string;
  lv: 1 | 2 | 3;
  title: string;
  desc: string;
  en: string;
  ko: string;
  /**
   * 이 상황을 실제로 연습할 수 있는 시나리오 키.
   * 있으면 카드에 "연습 가능" 배지가 붙고, 없으면 "준비 중" 으로 표시됩니다.
   * 카드는 커리큘럼 전체를 보여주고, 배지가 지금 어디까지 됐는지를 말합니다.
   */
  scene?: SceneKey;
};

export type Faq = { q: string; a: string };

export type DemoChoice = { t: string; good: boolean; fb: string };

export type DemoTurn = {
  ai: string;
  aiKo: string;
  choices: DemoChoice[];
};

export type DemoScenario = {
  icon: string;
  name: string;
  role: string;
  label: string;
  turns: DemoTurn[];
  end: string;
};

export type HeroLine = { who: "ai" | "me" | "tip"; text: string; sub?: string };
