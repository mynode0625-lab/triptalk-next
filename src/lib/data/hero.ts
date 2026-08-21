import type { HeroLine } from "@/types/landing";

export const HERO_SCRIPT: HeroLine[] = [
  { who: "ai",  text: "Good morning! May I see your passport, please?", sub: "안녕하세요! 여권 좀 보여주시겠어요?" },
  { who: "me",  text: "Sure, here you go." },
  { who: "ai",  text: "Any bags to check in today?", sub: "오늘 부치실 짐이 있으신가요?" },
  { who: "me",  text: "Just one. Can I get an aisle seat?" },
  { who: "tip", text: "💡 좋아요! 'Could I get an aisle seat?'라고 하면 더 정중하게 들려요." },
  { who: "ai",  text: "Of course. Seat 14C. Enjoy your flight!", sub: "물론이죠. 14C입니다. 즐거운 비행 되세요!" }
];

export const STATS: { count: number; label: string }[] = [
  { count: 62, label: "학습 상황" },
  { count: 8, label: "AI 캐릭터" },
  { count: 1200, label: "핵심 표현" }
];
