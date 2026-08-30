import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 서버 클라이언트.
 *
 * ⚠ **RLS 를 쓰지 않는다.** 이 키(`service_role`)는 모든 행을 읽고 쓴다. 데이터베이스가
 * 막아주는 것이 없으므로, 조회 범위는 코드가 스스로 좁혀야 한다. 규칙은
 * `supabase-plan.md` 2장에 있고 요약하면 이렇다.
 *
 *   · 이 파일 밖에서 클라이언트를 만들지 않는다 (쿼리는 `src/lib/db/` 안에서만)
 *   · 조회 조건을 요청 본문·쿼리스트링에서 받은 값으로 만들지 않는다
 *   · 키 이름에 `NEXT_PUBLIC_` 을 붙이지 않는다 — 붙는 순간 브라우저로 나간다
 *
 * 맨 위의 `server-only` 는 클라이언트 컴포넌트가 실수로 이 파일을 불러오면 빌드를
 * 깨뜨린다. 사람의 주의력에 기대지 않으려고 둔다.
 */

let cached: SupabaseClient | null = null;

/** 환경변수가 없으면 기능을 켜지 않는다 — 없는 채로 배포돼도 사이트는 굴러가야 한다. */
export function dbReady(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function db(): SupabaseClient | null {
  if (!dbReady()) return null;
  cached ??= createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return cached;
}
