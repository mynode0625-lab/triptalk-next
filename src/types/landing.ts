export type Character = {
  emoji: string;
  name: string;
  role: string;
  desc: string;
  tags: string[];
  line: string;
  ko: string;
};

export type SituationKey = "airport" | "hotel" | "food" | "city" | "trouble";

export type Situation = {
  emoji: string;
  lv: 1 | 2 | 3;
  title: string;
  desc: string;
  en: string;
  ko: string;
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
