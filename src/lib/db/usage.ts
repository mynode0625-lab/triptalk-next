import "server-only";
import { db } from "./client";

/**
 * 사용량 로그 — 호출 하나에 한 줄.
 *
 * 인메모리 카운터는 인스턴스마다 따로 세므로 전역 상한이 아닙니다. 이 파일은 그
 * 세는 일을 공유 저장소로 옮깁니다 (`supabase-plan.md` 5.3).
 *
 * **누적하지 않고 쌓기만 합니다.** 읽고-더하고-쓰기가 없으니 동시 요청이 서로를
 * 덮어쓸 값 자체가 없습니다. 대신 셀 때 행을 세야 합니다.
 *
 * 여기에 담기는 것은 주체를 가리키는 열쇠(`acct:...` 또는 `ip:...`)와 시각뿐입니다.
 * 이름·이메일·읽은 문장은 넣지 않습니다 — 남용을 막는 데 필요하지 않습니다.
 */

const TABLE = "usage_events";

/** 이 창 안에서 몇 번 불렸는지. 주체별로, 그리고 전부 합쳐서. */
export type UsageCounts = {
  /** `subjects` 로 물어본 열쇠별 횟수. 한 번도 없으면 0 */
  bySubject: Record<string, number>;
  /** 같은 창 안의 전체 호출 수 (주체를 가리지 않음) */
  total: number;
};

/**
 * 한 창 안의 행을 **한 번의 질의로** 가져와 셉니다.
 *
 * 주체별로 `count` 질의를 따로 던지면 왕복이 세 번(계정·IP·전체)이 됩니다. 창이
 * 24시간이고 전체 상한이 수백 건이라 행을 그대로 받아 세는 편이 싸고 단순합니다.
 *
 * `CAP` 를 넘길 만큼 쌓이면 아래 세 숫자는 실제보다 작게 나옵니다. 그 지점은 이미
 * 어떤 상한이든 넘긴 뒤라 판정이 뒤집히지 않습니다 — 상한보다 넉넉히 큰 값이어야
 * 한다는 것이 `CAP` 의 유일한 조건입니다.
 *
 * DB 가 없거나 질의가 실패하면 `null` — **부르는 쪽이 인메모리 상한으로 되돌아가야
 * 합니다.** 상한 없이 열어두면 그대로 과금입니다.
 */
const CAP = 5000;

export async function countUsage(
  kind: string, since: Date, subjects: string[]
): Promise<UsageCounts | null> {
  const client = db();
  if (!client) return null;

  const { data, error } = await client
    .from(TABLE)
    .select("subject")
    .eq("kind", kind)
    .gte("occurred_at", since.toISOString())
    .limit(CAP);

  if (error) {
    console.error("[TripTalk] 사용량을 세지 못했습니다:", error.message);
    return null;
  }

  const rows = (data ?? []) as { subject: string }[];
  const bySubject: Record<string, number> = {};
  for (const s of subjects) bySubject[s] = 0;
  for (const row of rows) {
    if (row.subject in bySubject) bySubject[row.subject] += 1;
  }
  return { bySubject, total: rows.length };
}

/**
 * 호출 한 건을 남깁니다.
 *
 * 실패해도 요청을 막지 않습니다 — 로그를 못 남겼다고 정상 이용자의 음성을 끊는
 * 것은 균형이 맞지 않습니다. 대신 다음 요청의 셈이 그만큼 헐거워집니다.
 */
export async function recordUsage(kind: string, subject: string): Promise<void> {
  const client = db();
  if (!client) return;

  const { error } = await client
    .from(TABLE)
    .insert({ subject, kind, occurred_at: new Date().toISOString() });

  if (error) console.error("[TripTalk] 사용량을 남기지 못했습니다:", error.message);
}

/**
 * 오래된 행 청소.
 *
 * 서비스 로직이 아니라 운영 작업입니다. 트리거나 cron 을 두지 않기로 했으므로
 * (`supabase-plan.md` 0장) 요청 처리 중에 **가끔** 부릅니다. 한 인스턴스가 한 시간에
 * 한 번을 넘지 않고, 결과를 기다리지 않습니다.
 */
const PURGE_EVERY_MS = 60 * 60 * 1000;
/** 상한 창이 24시간이라 3일이면 넉넉합니다. */
const KEEP_MS = 3 * 24 * 60 * 60 * 1000;

let lastPurgeAt = 0;

export function purgeOldUsageEvents(): void {
  const client = db();
  if (!client) return;

  const now = Date.now();
  if (now - lastPurgeAt < PURGE_EVERY_MS) return;
  lastPurgeAt = now;

  void client
    .from(TABLE)
    .delete()
    .lt("occurred_at", new Date(now - KEEP_MS).toISOString())
    .then(({ error }) => {
      if (error) console.error("[TripTalk] 오래된 사용량 로그를 지우지 못했습니다:", error.message);
    });
}
