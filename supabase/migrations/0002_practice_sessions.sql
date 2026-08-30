-- 연습 기록 (2026-08-30)
--
-- **로그인한 사람의 기록만 저장합니다.** 비로그인 방문자를 가리킬 열쇠가 아직
-- 없기 때문입니다 (supabase-plan.md 3장). 그래서 device_id 칸을 두지 않았습니다.
--
-- 사용자 테이블을 따로 두지 않고 (provider, sub) 를 그대로 열쇠로 씁니다.
-- 운영자가 회원을 관리할 일이 없고, 있지도 않은 회원 테이블을 만들면 지켜야 할
-- 약속만 늘어납니다.
--
-- ⚠ 지금 로그인은 데모라 sub 가 로그인할 때마다 새로 발급됩니다. 즉 저장은 되지만
-- 로그아웃 후 다시 들어오면 **같은 사람으로 찾아주지 못합니다.** 신한 SOL 연동으로
-- 고정된 sub 가 들어와야 제 구실을 합니다. 그때 이 테이블은 그대로 쓰면 됩니다.
--
-- 트리거도 함수도 없습니다. 값을 채우고 검증하는 일은 전부 서버 코드가 합니다.

create table if not exists practice_sessions (
  id              uuid        primary key default gen_random_uuid(),

  author_provider text        not null,
  author_sub      text        not null,

  scene_key       text        not null,              -- 'hotel' 등 (SceneKey)
  turns           smallint    not null check (turns between 0 and 20),
  -- 말하기로 답한 문장이 없으면(전부 타이핑) 발음 점수가 없습니다.
  avg_score       smallint             check (avg_score between 0 and 100),
  scores          smallint[]  not null default '{}',

  -- 리포트를 그대로 다시 보여주는 것이 유일한 용도라 통째로 둡니다.
  -- 통계가 필요해지면 그때 뽑아냅니다 (supabase-plan.md 4장).
  corrections     jsonb       not null default '[]',
  words           jsonb       not null default '[]',

  created_at      timestamptz not null default now()
);

-- 본인 기록을 최신순으로 가져오는 것이 전부입니다.
create index if not exists practice_sessions_owner_recent
  on practice_sessions (author_provider, author_sub, created_at desc);
