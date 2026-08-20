/** 표현 교정 규칙 — practice.js §3 */
import type { CorrectionItem, ExpressionResult, SceneTurn } from "@/types/practice";

type Rule = {
  re: RegExp;
  /** 교정 대상일 때의 대체 표현 */
  to?: string;
  why?: string;
  /** 지적하지 않고 넘어가는 규칙 */
  ok?: boolean;
  /** ok 규칙 중 칭찬할 것 */
  praise?: string;
};

export const RULES: Rule[] = [
  { re: /\bgive me\b/i, to: "Could I have …, please?", why: "‘Give me’는 명령처럼 들립니다. 요청은 Could I have ~ 로." },
  { re: /\bi want\b/i, to: "I'd like …", why: "‘I want’는 직설적입니다. 서비스 상황에서는 I'd like 이 자연스럽습니다." },
  { re: /\bi don'?t care\b/i, to: "Either is fine, thank you.", why: "무관심하게 들립니다. 상관없다는 뜻은 Either is fine 으로." },
  { re: /\bhow much (is the )?price\b/i, to: "How much is it?", why: "price는 how much와 겹칩니다." },
  { re: /\bwhere is (the )?toilet\b/i, to: "Where's the restroom?", why: "미국에서는 restroom / bathroom 을 씁니다." },
  { re: /\bi go to\b/i, to: "I'm going to …", why: "예정된 일은 현재진행형으로 말합니다." },
  { re: /\bhow long time\b/i, to: "How long …?", why: "How long 자체에 ‘시간’ 뜻이 있습니다." },
  { re: /\bwhat time (does|is) .* start\b/i, ok: true },
  { re: /\bpeoples\b/i, to: "people", why: "people은 이미 복수형입니다." },
  { re: /\binformations\b/i, to: "information", why: "information은 셀 수 없는 명사입니다." },
  { re: /\badvices\b/i, to: "advice", why: "advice는 셀 수 없는 명사입니다." },
  { re: /\bluggages\b/i, to: "luggage", why: "luggage는 셀 수 없는 명사입니다." },
  { re: /\bmoneys\b/i, to: "money", why: "money는 셀 수 없는 명사입니다." },
  { re: /\bi have reservation\b/i, to: "I have a reservation", why: "단수 명사 앞에는 관사 a가 필요합니다." },
  { re: /\b(i need|i want|i'd like|there is|can i get|do you have)\s+(reservation|question|problem|ticket|receipt|room|seat|table|discount|map|towel|bag)\b/i,
    to: "… a $2", why: "셀 수 있는 단수 명사 앞에는 관사 a/an 을 붙입니다." },
  { re: /\bmy english is (not good|bad)\b/i, to: "I'm still learning English.", why: "자기 비하보다 자연스럽고 긍정적인 표현입니다." },
  { re: /\bi am fine,? thank you,? and you\b/i, to: "I'm good, thanks. How about you?", why: "교과서 문장입니다. 실제로는 이렇게 말합니다." },
  { re: /\bplease wait a moment\b/i, to: "Just a moment, please.", why: "더 자연스러운 어순입니다." },
  { re: /\bi lost my way\b/i, to: "I think I'm lost.", why: "원어민이 실제로 쓰는 표현입니다." },
  { re: /\bno problem\b/i, ok: true },
  /* 칭찬 규칙 */
  { re: /\b(could|would|may) (you|i)\b/i, ok: true, praise: "Could/Would/May 로 시작하는 정중한 요청이 아주 좋습니다." },
  { re: /\bexcuse me\b/i, ok: true, praise: "‘Excuse me’로 말을 거는 습관, 아주 좋습니다." },
  { re: /\bif (that'?s )?possible\b/i, ok: true, praise: "‘if that's possible’ 같은 완충 표현은 원어민이 특히 자주 씁니다." },
  { re: /\b(sorry|pardon).*(again|slowly|repeat)\b/i, ok: true, praise: "되묻는 표현을 정확히 썼습니다. 실전에서 가장 유용한 문장입니다." },
  { re: /\bthank you|thanks\b/i, ok: true, praise: "감사 표현을 덧붙이면 인상이 크게 달라집니다." }
];

export const IMPERATIVE = /^(give|send|bring|change|open|make|call|take|show|tell|help|wait|come|do)\b/i;

export function analyzeExpression(text: string, turn: SceneTurn): ExpressionResult {
  const t = text.trim();
  const items: CorrectionItem[] = [];
  const praises: string[] = [];

  RULES.forEach(r => {
    const m = t.match(r.re);
    if (!m) return;
    if (r.ok) { if (r.praise) praises.push(r.praise); return; }
    const to = (r.to as string).replace("$2", m[2] || "");
    items.push({ from: m[0], to, why: r.why as string });
  });

  // 명령형 + please 없음 (같은 첫 단어를 이미 지적했다면 생략)
  const firstWord = t.split(/\s+/)[0].toLowerCase();
  const already = items.some(it => it.from.toLowerCase().startsWith(firstWord));
  if (!already && IMPERATIVE.test(t) && !/please/i.test(t)) {
    items.push({
      from: t.split(/\s+/)[0],
      to: "Could you " + t.split(/\s+/)[0].toLowerCase() + " …, please?",
      why: "동사로 바로 시작하면 명령처럼 들립니다. Could you ~ , please 로 감싸주세요."
    });
  }
  // 요청인데 please 없음
  if (/\b(can|could|would) (i|you|we)\b/i.test(t) && !/please/i.test(t)) {
    items.push({
      from: t,
      to: t.replace(/[.?!]*$/, "") + ", please?",
      why: "요청 문장 끝에 please 하나만 붙여도 훨씬 부드럽습니다."
    });
  }
  // 너무 짧은 답
  const ws = t.split(/\s+/).filter(Boolean);
  if (ws.length <= 2 && !/^(yes|no|sure|okay|ok)\b/i.test(t)) {
    items.push({
      from: t,
      to: "주어 + 동사가 있는 완전한 문장으로",
      why: "단어만 말해도 통하지만, 문장으로 말해야 실력이 늘고 오해도 줄어듭니다."
    });
  }

  // 질문의 핵심 정보가 빠졌는지
  const low = t.toLowerCase();
  const onTopic = (turn.keys || []).some(k => low.includes(k));

  return { items: items.slice(0, 3), praises: praises.slice(0, 2), onTopic };
}
