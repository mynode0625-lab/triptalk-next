import "server-only";
import { db } from "./client";
import type { CorrectionItem, PracticeWord, SceneKey } from "@/types/practice";
import type { ProviderKey } from "@/types/session";

/**
 * 연습 기록.
 *
 * **로그인한 사람의 것만 저장합니다.** 비로그인 방문자를 가리킬 열쇠가 아직 없어
 * 행을 누구 앞으로 달지 정할 수 없기 때문입니다 (`supabase-plan.md` 3장).
 *
 * 사용자 테이블을 두지 않고 `(provider, sub)` 를 그대로 열쇠로 씁니다. 조회 조건은
 * **언제나 서명이 검증된 쿠키에서** 만들어야 합니다 — 요청 본문의 값으로 조건을
 * 만들면 남의 기록이 그대로 나갑니다. RLS 가 없어 이것이 유일한 방어선입니다.
 */

export type PracticeSession = {
  id: string;
  sceneKey: string;
  turns: number;
  /** 말하기로 답한 문장이 하나도 없으면 null */
  avgScore: number | null;
  corrections: CorrectionItem[];
  words: PracticeWord[];
  createdAt: string;
};

const TABLE = "practice_sessions";
const COLUMNS = "id, scene_key, turns, avg_score, corrections, words, created_at";

type Row = {
  id: string;
  scene_key: string;
  turns: number;
  avg_score: number | null;
  corrections: unknown;
  words: unknown;
  created_at: string;
};

const toSession = (r: Row): PracticeSession => ({
  id: String(r.id),
  sceneKey: String(r.scene_key),
  turns: Number(r.turns),
  avgScore: r.avg_score === null ? null : Number(r.avg_score),
  corrections: Array.isArray(r.corrections) ? (r.corrections as CorrectionItem[]) : [],
  words: Array.isArray(r.words) ? (r.words as PracticeWord[]) : [],
  createdAt: String(r.created_at)
});

export type NewPracticeSession = {
  provider: ProviderKey;
  sub: string;
  sceneKey: SceneKey;
  turns: number;
  avgScore: number | null;
  scores: number[];
  corrections: CorrectionItem[];
  words: PracticeWord[];
};

/** 저장에 실패해도 연습은 이미 끝났습니다. 화면을 막지 않으려고 boolean 만 돌려줍니다. */
export async function savePracticeSession(input: NewPracticeSession): Promise<boolean> {
  const client = db();
  if (!client) return false;

  const { error } = await client.from(TABLE).insert({
    author_provider: input.provider,
    author_sub: input.sub,
    scene_key: input.sceneKey,
    turns: input.turns,
    avg_score: input.avgScore,
    scores: input.scores,
    corrections: input.corrections,
    words: input.words
  });

  if (error) console.error("[TripTalk] 연습 기록을 저장하지 못했습니다:", error.message);
  return !error;
}

/** 본인 기록만. 조건의 provider·sub 는 반드시 쿠키에서 온 값이어야 합니다. */
export async function listMyPracticeSessions(
  provider: ProviderKey, sub: string, limit = 10
): Promise<PracticeSession[]> {
  const client = db();
  if (!client) return [];

  const { data, error } = await client
    .from(TABLE)
    .select(COLUMNS)
    .eq("author_provider", provider)
    .eq("author_sub", sub)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[TripTalk] 연습 기록을 읽지 못했습니다:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(toSession);
}

/** 본인 기록 전부 삭제. 지울 대상을 요청에서 받지 않습니다. */
export async function deleteMyPracticeSessions(
  provider: ProviderKey, sub: string
): Promise<boolean> {
  const client = db();
  if (!client) return false;

  const { error } = await client
    .from(TABLE)
    .delete()
    .eq("author_provider", provider)
    .eq("author_sub", sub);

  if (error) console.error("[TripTalk] 연습 기록을 지우지 못했습니다:", error.message);
  return !error;
}
