/**
 * 랜딩 통계 — 실제 데이터에서 직접 셉니다.
 *
 * 손으로 적어 둔 숫자는 내용이 늘어도 그대로 남아 사실과 어긋납니다.
 * ("누적 학습자 38만명" 이 그렇게 남아 있었습니다.) 여기서 세면
 * 시나리오나 교정 규칙을 추가하는 것만으로 화면 숫자가 따라 올라갑니다.
 *
 * 주의 — 서버 컴포넌트(Hero)에서만 읽고 Stats 에 props 로 내려보냅니다.
 * 클라이언트 컴포넌트가 이 파일을 직접 import 하면 시나리오·교정 사전이
 * 통째로 브라우저 번들에 실립니다. (hero.ts 에 두지 않은 이유)
 */
import { RULES } from "@/lib/correction/expression";
import { PATTERNS, SILENT, STRESS } from "@/lib/correction/pronunciation";
import { CHARACTERS } from "./characters";
import { SCENES } from "./scenarios";

const scenes = Object.values(SCENES);

/** 시나리오 턴마다 준비해 둔 모범 답안 문장 수 */
const modelSentences = scenes.reduce(
  (total, scene) => total + scene.turns.reduce((n, turn) => n + turn.models.length, 0),
  0
);

/** 발음(묵음·강세·패턴) + 표현 교정 규칙 수 */
const correctionRules =
  Object.keys(SILENT).length + Object.keys(STRESS).length + PATTERNS.length + RULES.length;

export const STATS: { count: number; label: string }[] = [
  { count: scenes.length, label: "연습 시나리오" },
  { count: CHARACTERS.length, label: "AI 캐릭터" },
  { count: modelSentences, label: "모범 답안 문장" },
  { count: correctionRules, label: "교정 규칙" }
];
