import "server-only";
import { db } from "./client";

export type Review = {
  id: string;
  nickname: string;
  rating: number;
  body: string;
  createdAt: string;
};

/** 화면에 보이는 글자 수 상한 — 넘기면 잘라내지 않고 거절한다. */
export const NICKNAME_MAX = 12;
export const BODY_MIN = 5;
export const BODY_MAX = 200;

const TABLE = "reviews";

/**
 * 최근 후기.
 *
 * `hidden` 이 켜진 행은 내보내지 않는다. 지금 이 값을 끄고 켜는 화면은 없고
 * Supabase 대시보드에서 직접 바꾼다 — 부적절한 글이 올라왔을 때의 응급 수단이다.
 */
export async function listReviews(limit = 6): Promise<Review[]> {
  const client = db();
  if (!client) return [];

  const { data, error } = await client
    .from(TABLE)
    .select("id, nickname, rating, body, created_at")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[TripTalk] 후기를 읽지 못했습니다:", error.message);
    return [];                       // 후기가 없다고 보여줄지언정 랜딩이 깨지면 안 된다
  }

  return (data ?? []).map(r => ({
    id: String(r.id),
    nickname: String(r.nickname),
    rating: Number(r.rating),
    body: String(r.body),
    createdAt: String(r.created_at)
  }));
}

export type NewReview = { nickname: string; rating: number; body: string };

/** 성공하면 저장된 후기를, 실패하면 null 을 돌려준다. */
export async function createReview(input: NewReview): Promise<Review | null> {
  const client = db();
  if (!client) return null;

  const { data, error } = await client
    .from(TABLE)
    .insert({ nickname: input.nickname, rating: input.rating, body: input.body })
    .select("id, nickname, rating, body, created_at")
    .single();

  if (error || !data) {
    console.error("[TripTalk] 후기를 저장하지 못했습니다:", error?.message);
    return null;
  }

  return {
    id: String(data.id),
    nickname: String(data.nickname),
    rating: Number(data.rating),
    body: String(data.body),
    createdAt: String(data.created_at)
  };
}
