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


/* ── 관리자용 ────────────────────────────────────────────────
   아래 셋은 `/api/admin/reviews` 에서만 부릅니다. 공개 화면은 쓰지 않습니다. */

/** 관리자 목록에 보일 후기 — 숨김·삭제된 것까지 포함합니다. */
export type AdminReview = Review & { status: string };

const ADMIN_COLUMNS = "id, author_name, rating, body, created_at, status";

/** 상태와 무관하게 전부. 무엇을 감췄는지도 봐야 하기 때문입니다. */
export async function listAllReviews(limit = 100): Promise<AdminReview[]> {
  const client = db();
  if (!client) return [];

  const { data, error } = await client
    .from(TABLE)
    .select(ADMIN_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[TripTalk] 관리자 목록을 읽지 못했습니다:", error.message);
    return [];
  }
  return ((data ?? []) as (Row & { status: string })[]).map(r => ({
    ...toReview(r),
    status: String(r.status)
  }));
}

/**
 * 감추거나 다시 보이게 합니다.
 *
 * 지우는 것보다 이쪽을 먼저 권합니다. 잘못 감췄으면 되돌릴 수 있고, 무엇을 왜
 * 감췄는지 확인할 여지가 남습니다.
 */
export async function setReviewStatus(id: string, status: "visible" | "hidden"): Promise<boolean> {
  const client = db();
  if (!client) return false;

  const { error } = await client
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) console.error("[TripTalk] 후기 상태를 바꾸지 못했습니다:", error.message);
  return !error;
}

/** 되돌릴 수 없습니다. 감추는 것으로 충분한지 먼저 생각하세요. */
export async function deleteReview(id: string): Promise<boolean> {
  const client = db();
  if (!client) return false;

  const { error } = await client.from(TABLE).delete().eq("id", id);
  if (error) console.error("[TripTalk] 후기를 지우지 못했습니다:", error.message);
  return !error;
}
