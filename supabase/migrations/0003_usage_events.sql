-- 사용량 로그 — /api/tts 호출 한 건에 한 줄 (2026-08-31)
--
-- 지금까지 호출 제한은 서버 인스턴스 **메모리**에만 있었습니다. 서버리스에서는
-- 인스턴스마다 따로 세므로 상한이 인스턴스 수만큼 곱해집니다. 즉 상한이 상한이
-- 아니었습니다. 이 테이블이 그것을 전역 상한으로 만듭니다 (supabase-plan.md 5.3).
--
-- **누적하지 않고 쌓기만 합니다.** 호출할 때마다 한 줄을 넣고, 셀 때는 셉니다.
-- count 컬럼을 두고 더하면 동시 요청이 서로를 덮어쓰므로 Postgres 함수로 한 문장에
-- 끝내야 하는데, DB 에 로직을 두지 않기로 했습니다(2장). 더하는 연산이 없으면
-- 경합할 값 자체가 없습니다.
--
-- 트리거도 함수도 없습니다. occurred_at 은 default 를 쓰지 않고 서버 코드가 값을
-- 넣습니다 — 언제 찍힌 시각인지가 코드에 보여야 합니다.
--
-- ⚠ 여기에는 **IP 주소가 들어갑니다.** 개인정보이므로 개인정보처리방침 2·4장에
-- 적어 두었고, 보관 기간은 아래 3일입니다. 이름·이메일은 넣지 않습니다 —
-- 계정은 이메일이 아니라 sub(제공자가 준 고유 id)로 가리킵니다.

create table if not exists usage_events (
  id          bigserial   primary key,

  -- 이 호출을 누구 앞으로 달아둘지. 'acct:shinhan:<sub>' 또는 'ip:1.2.3.4' 입니다.
  -- 하루 총량은 따로 표시하지 않습니다 — 주체를 보지 않고 전부 세면 됩니다.
  subject     text        not null,
  kind        text        not null,              -- 'tts'
  occurred_at timestamptz not null
);

-- 세는 질의는 둘뿐입니다: (kind, occurred_at) 로 창을 자르고, subject 로 나눕니다.
create index if not exists usage_events_window
  on usage_events (kind, occurred_at desc);

-- 오래된 행은 지웁니다. 상한 창이 24시간이라 3일이면 넉넉합니다.
-- 서비스 로직이 아니라 운영 작업이므로 트리거가 아니라 코드가 부릅니다
-- (src/lib/db/usage.ts 의 purgeOldUsageEvents).
--
--   delete from usage_events where occurred_at < now() - interval '3 days';
