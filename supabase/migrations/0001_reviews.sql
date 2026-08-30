-- 후기 (2026-08-30)
--
-- 접근은 서버(Route Handler)를 통해서만 이루어지고, 브라우저는 이 테이블을 직접
-- 부르지 않는다. supabase-plan.md 2·4.5장 참고.
--
-- RLS 는 쓰지 않는다(2026-08-30 결정). 대시보드가 경고하는 대로, anon 키를 아는
-- 사람은 REST API 로 이 테이블에 직접 접근할 수 있다. 우리 앱은 anon 키를 어디에도
-- 내보내지 않아 실제 경로는 없지만, 키가 새면 막을 것이 없다는 점은 기록해 둔다.
--
-- 이 파일에는 트리거도 함수도 없다. 값을 채우고 검증하는 일은 전부 서버 코드가 한다.
-- 아래 check·unique 는 서비스 로직이 아니라 무결성 제약이다 — 코드가 먼저 검증하고,
-- 제약은 코드가 틀렸을 때를 위한 마지막 방어선이다.
--
-- default 도 마찬가지로 로직이 아니라 컬럼 정의다. 다만 의미가 있는 시각(수정 시각)은
-- 서버 코드가 값을 직접 넣는다 — 언제 찍힌 값인지가 코드에 보여야 하기 때문이다.
--
-- 후기는 **로그인한 사람만** 남길 수 있다. 익명 쓰기는 막을 수단이 IP 밖에 없어
-- 실효가 없지만, 작성자가 계정에 묶이면 반복 남용자를 끊어낼 수 있다.
--
-- 작성자 세 컬럼(author_*)은 서버가 검증한 세션 쿠키에서만 채운다.
-- 요청 본문의 값을 넣으면 그 자리가 곧 사칭이 된다.

create table if not exists reviews (
  id              uuid        primary key default gen_random_uuid(),

  author_provider text        not null,              -- 'shinhan'
  author_sub      text        not null,              -- 제공자 고유 id (Session.sub)
  author_name     text        not null,              -- 저장 시점의 표시 이름 (스냅숏)

  rating          smallint    not null check (rating between 1 and 5),
  body            text        not null check (char_length(body) between 5 and 200),
  scene_key       text,                              -- 어느 연습에 대한 후기인지 (선택)

  -- visible : 공개
  -- hidden  : 운영자가 감춤 (신고·부적절)
  -- removed : 작성자가 지움
  status          text        not null default 'visible'
                  check (status in ('visible', 'hidden', 'removed')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- 한 계정에 후기 하나. 두 번째 글은 insert 가 아니라 update 가 된다.
  -- 도배를 호출 제한이 아니라 스키마로 막는다.
  unique (author_provider, author_sub)
);

create index if not exists reviews_public_recent
  on reviews (status, created_at desc)
  where status = 'visible';

-- 반복 남용자를 끊는 목록. 로그인을 요구한 이유가 이것이다.
create table if not exists blocked_authors (
  provider   text        not null,
  sub        text        not null,
  reason     text,
  blocked_at timestamptz not null default now(),
  primary key (provider, sub)
);
