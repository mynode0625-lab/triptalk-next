import "server-only";
import { db } from "./client";
import type { ProviderKey } from "@/types/session";

/**
 * 화면으로 나가는 후기.
 *
 * `author_provider` · `author_sub` 는 **의도적으로 빠져 있습니다.** 제공자가 부여한
 * 식별자라 개인정보로 다루며, 남용 대응에만 씁니다. RLS 가 없어 실수로 전체 컬럼을
 * 내보내기 쉬우므로, 아래 쿼리는 컬럼을 하나씩 나열합니다.
 */
export type Review = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
};

export const BODY_MIN = 5;
export const BODY_MAX = 200;

const TABLE = "reviews";
const PUBLIC_COLUMNS = "id, author_name, rating, body, created_at";

type Row = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
};

const toReview = (r: Row): Review => ({
  id: String(r.id),
  authorName: String(r.author_name),
  rating: Number(r.rating),
  body: String(r.body),
  createdAt: String(r.created_at)
});

/** 공개된 후기만 최신순으로. 숨겨졌거나 지워진 글은 나가지 않습니다. */
export async function listReviews(limit = 6): Promise<Review[]> {
  const client = db();
  if (!client) return [];

  const { data, error } = await client
    .from(TABLE)
    .select(PUBLIC_COLUMNS)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[TripTalk] 후기를 읽지 못했습니다:", error.message);
    return [];                       // 후기가 없다고 보일지언정 랜딩이 깨지면 안 됩니다
  }
  return ((data ?? []) as Row[]).map(toReview);
}

/** 차단된 작성자인지. 확인에 실패하면 막는 쪽으로 둡니다. */
export async function isBlocked(provider: ProviderKey, sub: string): Promise<boolean> {
  const client = db();
  if (!client) return true;

  const { data, error } = await client
    .from("blocked_authors")
    .select("sub")
    .eq("provider", provider)
    .eq("sub", sub)
    .maybeSingle();

  if (error) {
    console.error("[TripTalk] 차단 목록을 읽지 못했습니다:", error.message);
    return true;                     // 남용을 막으려고 둔 장치이므로 실패 시 보수적으로
  }
  return Boolean(data);
}

export type ReviewInput = {
  provider: ProviderKey;
  sub: string;
  name: string;
  rating: number;
  body: string;
  sceneKey?: string | null;
};

/**
 * 후기를 남깁니다. 이미 남긴 사람이면 **새로 쌓지 않고 고칩니다.**
 * 한 계정에 후기 하나라는 규칙은 코드가 아니라 테이블의 unique 제약이 지킵니다.
 */
export async function upsertReview(input: ReviewInput): Promise<Review | null> {
  const client = db();
  if (!client) return null;

  const { data, error } = await client
    .from(TABLE)
    .upsert(
      {
        author_provider: input.provider,
        author_sub: input.sub,
        author_name: input.name,
        rating: input.rating,
        body: input.body,
        scene_key: input.sceneKey ?? null,
        status: "visible",           // 지웠던 사람이 다시 쓰면 되살아납니다
        updated_at: new Date().toISOString()
      },
      { onConflict: "author_provider,author_sub" }
    )
    .select(PUBLIC_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[TripTalk] 후기를 저장하지 못했습니다:", error?.message);
    return null;
  }
  return toReview(data as Row);
}
