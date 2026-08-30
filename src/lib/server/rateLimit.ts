import "server-only";
import type { NextRequest } from "next/server";

/**
 * 아주 단순한 호출 제한.
 *
 * 로그인이 있어도 제한은 필요합니다. 지금 로그인은 데모라 **계정을 무제한으로 새로
 * 만들 수 있어서**, "한 계정 한 번" 같은 규칙이 계정을 갈아치우는 것만으로 무너집니다.
 * 계정으로 세는 규칙과 IP 로 세는 규칙은 서로를 대신하지 못합니다.
 *
 * ⚠ 상태가 서버 인스턴스 메모리에 있습니다. 서버리스에서는 인스턴스마다 따로 세므로
 * 진짜 전역 상한이 아닙니다 — 인스턴스가 늘면 그만큼 곱해집니다. 남용의 **속도를
 * 늦추는** 장치이지 차단이 아닙니다. 정확한 상한이 필요해지면 공유 저장소로 옮기세요
 * (`supabase-plan.md` 5.3 에 함수 없이 세는 방법을 적어 두었습니다).
 */

type Bucket = { count: number; resetAt: number };

/** 이름이 다른 제한끼리 서로 간섭하지 않도록 통을 따로 둡니다. */
const buckets = new Map<string, Map<string, Bucket>>();

export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export type LimitResult = { ok: true } | { ok: false; retryAfter: number };

/**
 * `key` 를 한 번 세고, 상한을 넘었는지 알려줍니다.
 * 넘었을 때는 카운트를 올리지 않습니다 — 두드릴수록 시간이 늘어나면 정상 사용자가
 * 언제 풀리는지 알 수 없게 됩니다.
 */
export function hit(name: string, key: string, max: number, windowMs: number): LimitResult {
  const now = Date.now();
  let map = buckets.get(name);
  if (!map) { map = new Map(); buckets.set(name, map); }

  const entry = map.get(key);
  if (!entry || now >= entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    // 만료된 항목을 걷어내 Map 이 무한히 커지지 않게 합니다.
    if (map.size > 1000) for (const [k, v] of map) if (now >= v.resetAt) map.delete(k);
    return { ok: true };
  }

  if (entry.count >= max) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true };
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
