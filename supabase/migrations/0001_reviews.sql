-- 후기 (2026-08-30)
--
-- RLS 를 켜지 않는다. 접근은 서버(Route Handler)를 통해서만 이루어지고,
-- 브라우저는 이 테이블을 직접 부르지 않는다. supabase-plan.md 2장 참고.
--
-- 개인을 식별하는 값은 담지 않는다. `nickname` 은 사용자가 직접 적는 표시 이름이며
-- 화면에서 "실명·연락처를 적지 마세요" 라고 안내한다.

create table if not exists reviews (
  id         uuid        primary key default gen_random_uuid(),
  nickname   text        not null check (char_length(nickname) between 1 and 12),
  rating     smallint    not null check (rating between 1 and 5),
  body       text        not null check (char_length(body) between 5 and 200),
  -- 부적절한 글이 올라왔을 때의 응급 수단. 대시보드에서 직접 켠다.
  hidden     boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists reviews_visible_recent
  on reviews (hidden, created_at desc);
