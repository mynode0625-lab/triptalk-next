# Supabase 도입 계획

작성 2026-08-30. 대상 저장소 `triptalk-next`.

## 0. 전제

사용자가 정한 경계다. 이 문서의 모든 설계는 아래 셋을 지킨다.

| 결정 | 뜻 |
|---|---|
| 데이터베이스는 **Supabase** | Postgres. 기존 결정(2026-08-29)의 실행 계획이다 |
| **Supabase 는 저장소일 뿐이다** | 서비스 로직은 전부 Next.js 서버 코드가 갖는다. DB 는 값을 넣고 꺼내는 곳이다 |
| **RLS 를 쓰지 않는다** | 켜지도 않고 정책도 만들지 않는다. `service_role` 키로 접속한다 |
| **서버에서만 호출한다** | 브라우저는 Supabase 를 직접 부르지 않는다. Route Handler·서버 컴포넌트만 |
| **Supabase Auth 를 쓰지 않는다** | 로그인은 지금의 서명된 HttpOnly 쿠키(`src/lib/auth/cookie.ts`)를 그대로 쓴다 |
| **ORM 을 쓰지 않는다** | 기능이 단순하다. `@supabase/supabase-js` 로 직접 질의한다 |
| **트리거·저장 프로시저를 쓰지 않는다** | DB 안에 로직이 있으면 코드만 읽어서는 동작을 알 수 없다 |

### DB 에 두지 않는 것

| 두지 않음 | 대신 어디서 |
|---|---|
| 트리거 | 서버 코드. `updated_at` 도 코드가 값을 넣는다 |
| 함수·저장 프로시저(RPC) | 서버 코드. 5.3 의 카운터도 함수 없이 푼다 |
| 뷰·머티리얼라이즈드 뷰 | 필요하면 서버에서 조회해 조립한다 |
| RLS 정책 | 없음. 접근 통제는 Route Handler 가 한다 (2장) |
| Supabase Auth · Realtime · Storage · Edge Functions | 쓰지 않는다 |
| ORM 매핑 계층 | `src/lib/db/` 의 얇은 함수들이 대신한다 |

`check` 와 `unique` 제약은 남긴다. 이것은 서비스 로직이 아니라 **무결성 제약**이다.
검증은 코드가 먼저 하고, 제약은 코드가 틀렸을 때를 위한 마지막 방어선으로 둔다.
이 구분을 흐리면 "DB 에 아무 규칙도 두지 않는다" 가 되어, 잘못된 데이터가 조용히
쌓이는 쪽이 오히려 위험해진다.

### 이 선택이 무엇을 없애는지 먼저 적는다

RLS 를 끄고 `service_role` 키로 접속한다는 것은 **데이터베이스가 더 이상 아무것도
막아주지 않는다**는 뜻이다. 테이블을 만들 때 Supabase 가 경고하는 것도 이것이다 —
`anon` 키를 아는 사람은 REST API 로 테이블에 직접 접근할 수 있다. 우리 앱은 `anon`
키를 어디에도 내보내지 않아 실제 경로는 없지만, **키가 새면 막을 것이 없다.** RLS 가 있으면 쿼리를 잘못 써도 데이터베이스가 남의 행을
돌려주지 않지만, 지금 구조에서는 쿼리 한 줄이 곧 전체 공개다.

그래서 이 계획에는 **RLS 가 하던 일을 코드 규율로 대신하는 규칙**(2장)이 들어간다.
규칙을 지킬 수 없다면 RLS 를 켜는 편이 낫다. 지금은 접근 경로가 Route Handler
몇 개로 좁아 규율로 감당할 수 있다고 본다.

---

## 1. 무엇을 저장하려는가

지금 상태가 남는 곳은 세 군데이고 전부 임시다.

| 지금 | 어디 | 문제 |
|---|---|---|
| 연습 리포트(점수·교정·단어) | 아무 데도 저장 안 함 | 창을 닫으면 사라진다. 재방문할 이유가 없다 |
| 비로그인 무료 횟수 | 브라우저 `localStorage` | 시크릿 창이면 초기화. 안내일 뿐 방어선이 아니다 |
| `/api/tts` 호출 상한 | 서버 인스턴스 메모리 `Map` | 서버리스라 인스턴스마다 따로 센다. 전역 상한이 아니다 |

도입 순서는 **효용이 큰 것부터, 위험이 작은 것부터**다. 자세한 근거는 5장.

---

## 2. RLS 없이 지켜야 하는 규칙

데이터베이스가 막아주지 않으므로 아래는 타협 대상이 아니다.

### 2.0 어떤 키를 쓰는가

Supabase 는 두 벌의 키를 준다. **새 secret API key(`sb_secret_...`)** 를 쓴다.

- legacy `service_role` 과 권한은 같다(모든 행 접근). 다른 것은 유출 시 대응이다 —
  legacy 는 프로젝트 JWT 시크릿으로 서명돼 있어 폐기하려면 시크릿 자체를 갈아야 하고
  다른 것들이 함께 무효화된다. 새 secret 키는 **그 키 하나만 따로 폐기·재발급**한다
- `anon` / publishable 키는 쓰지 않는다. 브라우저에서 Supabase 를 부르지 않기 때문이다

### 2.1 secret 키는 서버 밖으로 나가지 않는다

- 환경변수 이름에 **`NEXT_PUBLIC_` 을 붙이지 않는다.** 붙는 순간 브라우저 번들에
  들어가고, 그 키 하나로 모든 테이블을 읽고 쓸 수 있다.
- Supabase 클라이언트를 만드는 모듈 맨 위에 `import "server-only";` 를 둔다.
  클라이언트 컴포넌트가 실수로 불러오면 빌드가 깨진다. 사람의 주의력에 기대지 않는다.
- 키가 유출되면 Supabase 대시보드에서 즉시 회전(rotate)한다.

### 2.2 조회 범위는 **언제나 쿠키에서 나온다**

가장 흔한 사고는 이 모양이다.

```ts
// ✗ 절대 금지 — 남의 기록을 그대로 내준다
const { userId } = await request.json();
const rows = await db.from("practice_sessions").select().eq("user_id", userId);
```

요청 본문·쿼리스트링·헤더로 들어온 식별자는 **누가 보낸 것인지 알 수 없다.**
반드시 서버가 검증한 쿠키에서 주체를 얻는다.

```ts
// ✓ 주체는 서명이 검증된 쿠키에서만
const who = await identify();            // readSessionCookie() / 디바이스 쿠키
if (!who) return unauthorized();
const rows = await db.from("practice_sessions").select().eq("owner_key", who.key);
```

### 2.3 쓰기도 마찬가지다

`insert` 할 때 `owner_key` 를 클라이언트가 보낸 값으로 채우지 않는다.
서버가 쿠키에서 얻은 값으로 덮어쓴다.

### 2.4 데이터베이스 접근은 한 파일에서만

`src/lib/db/` 밖에서 Supabase 클라이언트를 직접 만들지 않는다. 접근 경로가 한 곳이면
검토할 코드도 한 곳이다. 새 쿼리는 여기에 함수로 추가한다.

---

## 3. 사람을 구분할 열쇠 — **공모전 단계에서는 만들지 않는다**

2026-08-30 결정. 아래는 "언젠가 해야 하지만 지금은 하지 않는다" 는 기록이다.
DB 를 실제로 붙일 때 이 장으로 돌아온다.

### 3.1 왜 미루는가

공모전 제출본의 목표는 심사위원이 눌러 보는 화면이 사실과 맞는 것이다.
사람을 식별하는 장치는 그 목표에 기여하지 않으면서 **지켜야 할 약속만 늘린다** —
식별자를 만드는 순간 개인정보 보관 기간, 파기 절차, 처리 위탁 고지가 따라온다.
지금 상태(아무것도 저장하지 않음)가 오히려 방침에 적기 쉽다.

### 3.2 미루는 것의 목록

| 항목 | 지금 | 나중에 필요한 이유 |
|---|---|---|
| `Session.sub` (제공자 고유 id) | **만들지 않는다** | `email` 을 열쇠로 쓰면 사용자가 이메일을 바꿀 때 같은 사람이 남이 된다. `[provider]/route.ts` 의 `normalize()` 는 이미 `profile.id` 를 뽑아 두고 세션에 넣지 않고 버리므로, 필요해지면 그 값을 살리면 된다 |
| 디바이스 쿠키 (`triptalk_device`) | **만들지 않는다** | 비로그인 방문자의 무료 횟수를 서버에서 세려면 필요하다. 지금은 브라우저 `localStorage` 로 충분하다 |
| `users` · `devices` 테이블 | **만들지 않는다** | 위 둘이 없으면 행을 누구 것으로 둘지 정할 수 없다 |

### 3.3 그래서 지금 무료 이용은 이렇게 동작한다

식별자 없이, 브라우저에 남는 표식만으로 판정한다.

| 대상 | 제공 범위 | 판정 근거 |
|---|---|---|
| 환전하지 않은 방문자 | **연습 3회** | `localStorage` 카운터 (`triptalk.free.runs`) |
| 슈퍼SOL 환전 고객 | **여행 날짜까지 제한 없음** | 환전 완료 화면에서 넘어온 표식과 출국 예정일 |

환전 고객에게 무기한이 아니라 **여행 날짜까지**를 주는 이유는 두 가지다.
첫째, 이 서비스는 환전에 딸려 오는 것이므로 그 여행이 끝나면 근거도 끝난다.
둘째, 다음 여행의 환전 때 다시 만나는 구조가 되어 재방문 주기를 여행 주기가
정하게 된다. 무기한으로 열어두면 이 고리가 생기지 않는다.

출국 예정일은 **슈퍼SOL 이 링크에 실어 보낸다**. 4장 연동 단계의
`?scene=exchange&from=supersol` 에 날짜를 하나 더 붙이는 형태다.

> ⚠ 세 값 모두 브라우저에 있고 주소창으로 위조할 수 있다. **비용 방어선이 아니라
> 안내다.** 실제 비용은 서버가 세는 `/api/tts` 상한과 OpenAI 예산 상한이 막는다.
> 신한이 서명한 토큰을 서버에서 검증하기 전까지 이 성질은 바뀌지 않는다.

---

## 4. 스키마

`public` 스키마. 모든 테이블 RLS 비활성(기본값 그대로 두고 켜지 않는다).

```sql
-- 4.1 사용자 — 로그인한 사람
create table users (
  id           uuid primary key default gen_random_uuid(),
  provider     text        not null,               -- 'shinhan'
  sub          text        not null,               -- 제공자 고유 id (3.1)
  email        text,
  name         text,
  partner      boolean     not null default false, -- 환전 고객으로 확인된 적 있는지
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (provider, sub)
);

-- 4.2 디바이스 — 로그인하지 않은 방문자 (3.2)
create table devices (
  id           uuid primary key,                   -- 쿠키에 담긴 값
  user_id      uuid references users(id) on delete set null,
  partner      boolean     not null default false,
  free_runs    integer     not null default 0,     -- 무료 연습 사용 횟수
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
create index on devices (user_id);

-- 4.3 연습 기록
create table practice_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  device_id    uuid references devices(id) on delete set null,
  scene_key    text        not null,               -- 'checkin' 등 (SceneKey)
  turns        integer     not null default 0,
  avg_score    numeric(5,2),
  scores       integer[]   not null default '{}',
  corrections  jsonb       not null default '[]',  -- CorrectionItem[]
  words        jsonb       not null default '[]',  -- PracticeWord[]
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  check (user_id is not null or device_id is not null)
);
create index on practice_sessions (user_id, started_at desc);
create index on practice_sessions (device_id, started_at desc);
create index on practice_sessions (scene_key);

-- 4.4 사용량 카운터 — /api/tts 상한 (5.3)
create table usage_counters (
  subject  text    not null,    -- 'acct:shinhan:<sub>' | 'ip:1.2.3.4' | 'instance'
  kind     text    not null,    -- 'tts_day' | 'tts_minute'
  bucket   text    not null,    -- 날짜 'YYYY-MM-DD' 또는 분 'YYYY-MM-DDTHH:MM'
  count    integer not null default 0,
  primary key (subject, kind, bucket)
);
create index on usage_counters (bucket);
```

### 왜 교정·단어를 `jsonb` 로 두는가

정규화하면 테이블이 둘 더 생기고 조인이 늘어난다. 지금 이 데이터를 쓰는 곳은
**리포트를 그대로 다시 보여주는 것 하나**다. 통계가 필요해지는 시점 —
"어느 장면에서 사람들이 가장 막히는가" — 이 오면 그때 뽑아낸다. 미리 쪼개면
쓰지도 않는 조인을 지금부터 유지해야 한다.

`scene_key` 와 `avg_score` 는 스칼라 컬럼으로 빼 두었다. 이 둘은 확실히 집계에 쓴다.

### 시나리오 대본은 옮기지 않는다

`src/lib/data/scenarios.ts` 는 파일에 그대로 둔다. 타입 안전(`SceneKey` 유니온)과
TTS 프리렌더 스크립트가 파일을 기준으로 돌기 때문이다. DB 로 옮기면 둘 다 잃는다.

---

## 4.5 후기 스키마 — 로그인 사용자만 작성 (2026-08-30 설계)

후기를 로그인한 사람만 남길 수 있게 한다. 목적은 공격 방지와 **사후 대응**이다.
익명 쓰기는 막을 수단이 IP 밖에 없어 실효가 없지만, 작성자가 계정에 묶이면
반복 남용자를 끊어낼 수 있다.

### 설계 원칙

| 원칙 | 이유 |
|---|---|
| 작성자 값은 **쿠키에서만** 온다 | 요청 본문의 이름·id 를 믿으면 사칭이 된다. RLS 가 없으니 더더욱 |
| 열쇠는 `email` 이 아니라 **`sub`** | 이메일은 바뀐다. 바뀌는 값을 열쇠로 쓰면 같은 사람이 남이 된다 |
| **이메일을 저장하지 않는다** | 남용 대응에는 `sub` 로 충분하다. 저장하면 방침에 적을 것과 지킬 것만 늘어난다 |
| 한 사람당 후기 **하나** | 도배를 rate limit 이 아니라 **스키마로** 막는다. 다시 쓰면 고쳐진다 |
| 이름은 **저장 시점 스냅숏** | 나중에 이름이 바뀌어도 옛 후기가 흔들리지 않고, 조회에 조인이 필요 없다 |
| 숨김과 삭제를 **구분** | 운영자가 숨긴 것과 본인이 지운 것은 다른 사건이다. 대응 이력이 남아야 한다 |

### 테이블

```sql
create table reviews (
  id              uuid        primary key default gen_random_uuid(),

  -- 작성자. 세 값 모두 서버가 검증한 세션 쿠키에서만 채운다.
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
  unique (author_provider, author_sub)
);

create index reviews_public_recent
  on reviews (status, created_at desc)
  where status = 'visible';

-- 반복 남용자를 끊는 목록. 로그인을 요구한 이유가 이것이다.
create table blocked_authors (
  provider   text        not null,
  sub        text        not null,
  reason     text,
  blocked_at timestamptz not null default now(),
  primary key (provider, sub)
);
```

### 쓰기 경로

```
POST /api/reviews
  1. 세션 쿠키를 읽는다. 없으면 401
  2. 데모 세션이면 거절한다 (아래 참고)
  3. blocked_authors 에 있으면 403
  4. 길이·별점 검증
  5. upsert — (author_provider, author_sub) 충돌 시 update, updated_at 갱신
```

작성자 값은 **4번 이후에도 요청 본문에서 읽지 않는다.** `author_*` 세 컬럼은 전부
1번에서 얻은 세션으로 채운다.

### ⚠ 데모 세션 문제 — 이 설계의 전제가 아직 성립하지 않는다

신한 SOL 연동 키가 없어 로그인이 데모 모드로 돈다. `/api/auth/demo` 는 누구나 부를 수
있고 **모든 데모 세션이 같은 사람**이다(`PROVIDERS.shinhan.demo`). 그래서 지금 로그인을
걸어도

- 장벽이 되지 않는다 — 클릭 한 번이면 통과한다
- 후기가 전부 같은 이름으로 쌓인다
- `unique (author_provider, author_sub)` 때문에 **두 번째 사람이 첫 사람의 글을 덮어쓴다**

마지막 항목이 특히 나쁘다. 그래서 **데모 세션의 쓰기는 거절한다.** 그 결과 신한 연동
키가 들어오기 전까지 후기를 남길 수 있는 사람이 없다. 이 상태를 화면에서 어떻게 보일지는
아래 세 갈래가 있고, 결정이 필요하다.

| 안 | 지금 벌어지는 일 | 대가 |
|---|---|---|
| **가. 실제 로그인만 허용** | 연동 전까지 아무도 못 남긴다. 섹션은 목록만 보이고 비어 있다 | 심사위원도 남겨볼 수 없다 |
| 나. 데모도 허용 | 지금과 같다 | 로그인 장벽이 사실상 없고, 같은 이름으로 덮어쓴다 |
| 다. 데모마다 임시 신원 발급 | 데모 로그인 때 `sub` 를 무작위로 발급해 각자 다른 사람이 되게 한다 | 장벽은 약하다(다시 로그인하면 새 사람). 다만 덮어쓰기는 없어지고 차단도 가능하다 |

### 선결 — `Session.sub` 가 필요하다

이 설계는 3장에서 **만들지 않기로 한** `Session.sub` 를 요구한다. 로그인을 강제하는
순간 "누가 썼는가" 를 적어야 하므로 피할 수 없다. `[provider]/route.ts` 의
`normalize()` 가 이미 `profile.id` 를 뽑아 두고 버리므로, 살리는 작업 자체는 작다.

로그인 요구를 택한다면 3장의 결정을 이 항목에 한해 뒤집는 것이다. 디바이스 쿠키와
`users`·`devices` 테이블은 여전히 만들지 않는다 — 후기는 `author_sub` 만 있으면 되고,
별도의 사용자 테이블 없이 성립한다.

### 개인정보 영향

| 저장 | 공개 | 비고 |
|---|---|---|
| `author_name` | **공개** | 로그인 시 받은 이름. 작성 화면에서 공개된다고 알린다 |
| `body`, `rating` | **공개** | |
| `author_provider`, `author_sub` | **비공개** | 화면에 내보내지 않는다. 남용 대응 전용 |
| 이메일 | 저장 안 함 | |

`author_sub` 는 제공자가 부여한 식별자이므로 개인정보로 다룬다. 조회 API 응답에
**절대 포함하지 않는다** — RLS 가 없으므로 `select` 컬럼을 명시적으로 나열해서 막는다.

---

## 5. 도입 순서

각 단계는 **그 자체로 배포 가능**해야 한다. 한 번에 다 붙이지 않는다.

> **공모전 단계에서 착수하는 범위는 Phase 1 까지다.** Phase 2 이후는 3장의 식별자가
> 있어야 하고, 그것은 지금 만들지 않기로 했다.

### Phase 0 — 배선 (선결)

1. `npm i @supabase/supabase-js`
2. 환경변수 (Vercel: production·preview 모두)

   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_...    # NEXT_PUBLIC_ 절대 금지
   ```

3. `src/lib/db/client.ts`

   ```ts
   import "server-only";
   import { createClient } from "@supabase/supabase-js";

   /** 서버 전용. RLS 를 쓰지 않으므로 이 키는 모든 행을 읽고 쓴다 — 2장 규칙 참고. */
   export const db = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SECRET_KEY!,
     { auth: { persistSession: false, autoRefreshToken: false } }
   );

   /** 설정이 없으면 기능을 켜지 않는다 — 없는 채로 배포돼도 서비스는 굴러가야 한다. */
   export const dbReady = (): boolean =>
     Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
   ```

4. 스키마 적용 (Supabase SQL Editor 또는 마이그레이션 파일)

> 3장의 식별자(세션 `sub`, 디바이스 쿠키)는 **이 단계에서 만들지 않는다.**
> 그것이 없으면 Phase 2·4 를 시작할 수 없으므로, 실제 착수는 Phase 1 까지다.

**검증** — `dbReady()` 가 false 인 상태로 전체 화면이 지금과 똑같이 동작할 것.

### Phase 1 — 연습 기록 (가장 먼저)

효용이 가장 크고 위험이 가장 작다. 저장에 실패해도 **연습은 그대로 끝난다.**

- 쓰기: 시나리오 종료 시 `POST /api/practice/sessions` 한 번
- 읽기: `GET /api/practice/sessions` — 최근 20건. 주체는 쿠키에서만 (2.2)
- 화면: 연습 설정 화면에 "지난 연습" 목록. 없으면 아무것도 보이지 않는다

**실패 시** — 저장 실패는 조용히 넘긴다. 리포트는 이미 화면에 있다.
사용자에게 "저장 실패" 를 띄워서 얻을 것이 없다. 서버 로그에만 남긴다.

### Phase 2 — 무료 횟수 서버화 *(3장 식별자 필요 · 지금은 착수하지 않음)*

> ⚠ **횟수를 연습 기록과 같은 테이블에 두지 말 것.** 이용자는 '지난 연습'에서 자기
> 기록을 지울 수 있는데(개인정보 삭제권), 횟수가 같은 행에 있으면 **기록을 지우는
> 것이 곧 횟수 초기화**가 된다. 지금은 횟수가 브라우저에 있어 이 문제가 없지만,
> 서버로 옮기는 순간 생긴다. 남은 횟수는 별도 테이블에 두고 기록 삭제와 무관하게
> 유지한다 — 삭제권의 대상은 "무엇을 연습했는가" 이지 "얼마나 썼는가" 가 아니다.

`src/lib/practice/freeTrial.ts` 는 이 교체를 예상하고 `read`/`write` 를 분리해 두었다.
화면(`useFreeTrial()`)은 고치지 않는다.

- `GET /api/practice/quota` → `{ left, locked, partner }`
- `POST /api/practice/quota/consume` → 서버에서 원자적으로 1 증가
- 클라이언트의 `localStorage` 는 **오프라인 폴백으로만** 남긴다. 서버 응답이 오면
  서버 값이 이긴다

**주의** — 무료 횟수 판정이 끝나기 전에 연습을 시작하게 두면 안 된다. 이미
`trial.ready` 로 막고 있으니 그 조건을 유지한다. 네트워크가 느릴 때 사용자를
세워두는 시간이 길어지므로, **판정 실패 시에는 열어준다.** 막았을 때의 손해
(정상 사용자가 못 씀)가 열었을 때의 손해(몇 번 더 씀)보다 크다.

### Phase 3 — `/api/tts` 상한을 공유 저장소로

지금 인스턴스 메모리라 전역 상한이 아니다. 이걸 옮겨야 상한이 상한이 된다.

**동시성이 유일한 난점이다.** 읽고-더하고-쓰면 동시 요청에서 값이 어긋난다. 흔한 해법은
Postgres 함수로 한 문장에 끝내는 것이지만, **DB 에 로직을 두지 않기로 했으므로 쓰지 않는다.**

대신 **누적하지 않고 쌓기만 한다.** 호출할 때마다 한 줄을 넣고, 셀 때는 세면 된다.
더하는 연산이 없으니 경합할 값 자체가 없다.

```sql
-- 호출 하나에 한 줄. 갱신하지 않으므로 동시 요청이 서로를 덮어쓸 일이 없다.
create table usage_events (
  id          bigserial   primary key,
  subject     text        not null,   -- 'acct:shinhan:<sub>' | 'ip:1.2.3.4' | 'instance'
  kind        text        not null,   -- 'tts'
  occurred_at timestamptz not null    -- 서버 코드가 값을 넣는다 (default 를 쓰지 않는다)
);

create index usage_events_lookup on usage_events (subject, kind, occurred_at desc);
```

세는 쪽은 전부 서버 코드다.

```ts
// 지난 24시간 동안 이 주체가 몇 번 불렀는가
const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const { count } = await client
  .from("usage_events")
  .select("id", { count: "exact", head: true })
  .eq("subject", subject).eq("kind", "tts").gte("occurred_at", since);

if ((count ?? 0) >= MAX_PER_DAY) return tooMany();
await client.from("usage_events").insert({ subject, kind: "tts", occurred_at: new Date().toISOString() });
```

**대가를 적어 둔다.**

- 호출마다 질의가 두 번(세기 + 넣기) 늘어난다. TTS 호출 빈도에서는 문제되지 않는다
- 행이 쌓인다. 오래된 것은 지운다 — 로직이 아니라 운영 작업이므로 코드가 부른다

  ```sql
  delete from usage_events where occurred_at < now() - interval '3 days';
  ```
- 세고 나서 넣기까지의 짧은 틈에 동시 요청이 몰리면 상한을 한두 번 넘길 수 있다.
  정확한 회계가 아니라 남용 억제가 목적이므로 감수한다. 정확해야 한다면 그때
  경합을 다루는 방법을 다시 본다

**실패 시** — Phase 2 와 반대로 **보수적으로 간다.** DB 가 응답하지 않으면 기존 인메모리
상한으로 되돌아간다. 상한 없이 열어두면 그대로 과금이다. 인메모리 코드를 지우지 말고
폴백으로 남긴다.

### Phase 4 — 계정 레코드 *(3장 식별자 필요 · 신한 연동 확정 후)*

로그인 시 `users` 를 `upsert` 하고, 디바이스에 쌓인 기록을 사용자에게 잇는다.

```sql
update practice_sessions set user_id = $1 where device_id = $2 and user_id is null;
update devices set user_id = $1 where id = $2;
```

로그인 전 연습이 로그인 후에도 남는다. "로그인하면 이어서" 라는 약속이 실제가 된다.

---

## 6. 이 변경이 문서를 거짓말로 만든다

**개인정보처리방침에 이렇게 적혀 있다.**

> 운영자는 **회원 데이터베이스를 두지 않습니다.** 위 정보는 서버에 적재되지 않고,
> 위·변조를 막기 위해 서명된 세션 쿠키에 담겨 **이용자 본인의 브라우저에만** 보관됩니다.

Phase 1 을 배포하는 순간 이 문장은 사실이 아니다. **코드보다 먼저 고쳐야 한다.**

| 문서 | 고칠 것 |
|---|---|
| `/privacy` | "회원 데이터베이스를 두지 않습니다" 삭제. 저장 항목·보관 기간·파기 절차·처리 위탁(Supabase, 리전) 추가 |
| `/terms` | "연습 기록은 브라우저에만 남고 서버에 저장되지 않습니다. 창을 닫으면 사라집니다" 수정 |
| `README.md` | 기술 스택에 Supabase, 환경변수 목록 |
| `plan.md` | 10장의 "사용자 테이블과 학습 기록 서버 저장" 항목 갱신 |

특히 **처리 위탁**은 형식이 아니다. 개인정보를 국외 서버에 두면 위탁받는 자와
위탁 업무, 보관 국가를 방침에 적어야 한다. Supabase 프로젝트 리전을 정할 때
이 점을 함께 결정한다.

---

## 7. 하지 않을 것

| 안 함 | 왜 |
|---|---|
| Supabase Auth | 이미 서버 세션이 있다. 두 개의 인증은 두 개의 구멍이다 |
| RLS | 사용자 결정. 대신 2장의 규칙을 지킨다 |
| 브라우저에서 Supabase 직접 호출 | `service_role` 키가 나가야 하므로 불가능하다 |
| 시나리오 대본 이관 | 타입 안전과 프리렌더 스크립트를 잃는다 (4장) |
| Realtime · Storage · Edge Functions | 지금 쓸 데가 없고, 로직을 DB 쪽으로 옮기게 된다 |
| ORM (Prisma·Drizzle 등) | 질의가 단순하다. 매핑 계층을 두면 읽을 것만 늘어난다 |
| 트리거 · 저장 프로시저 · 뷰 | 코드만 읽어서는 동작을 알 수 없게 된다 |
| 음성 원본 저장 | 저장하지 않는다고 방침에 적었고, 지킬 만한 약속이다 |

---

## 8. 체크리스트

**Phase 0**
- [ ] Supabase 프로젝트 생성, 리전 결정 (6장 위탁 고지와 함께)
- [ ] `SUPABASE_SECRET_KEY` 에 `NEXT_PUBLIC_` 이 붙지 않았는지 확인
- [ ] `src/lib/db/client.ts` 에 `import "server-only"` 확인
- [ ] 스키마 적용
- [ ] **`dbReady()` false 상태로 전 화면 회귀 확인**

**Phase 1**
- [ ] 저장 실패해도 연습이 끝나는지 확인
- [ ] 다른 사람의 `device_id` 로 조회 시도 → 거부되는지 확인
- [ ] `/privacy` · `/terms` 를 **먼저** 고쳤는지 확인

**Phase 2**
- [ ] 판정 실패 시 열어주는지 확인
- [ ] 로그인 사용자는 세지 않는지 확인
- [ ] 환전 고객(`partner`)은 세지 않는지 확인

**Phase 3**
- [ ] 세기·넣기 두 질의가 동시 호출에서 상한을 크게 넘기지 않는지 확인
- [ ] DB 에 트리거·함수를 만들지 않았는지 확인
- [ ] DB 장애 시 인메모리 상한으로 되돌아가는지 확인
- [ ] 오래된 카운터 정리 작업 등록

**Phase 4**
- [ ] 로그인 전 기록이 로그인 후에 이어지는지 확인

---

## 9. 열려 있는 질문

1. **보관 기간을 얼마로 할 것인가.** 연습 기록을 무기한 두면 방침에 "회원 탈퇴 시까지"
   라고 써야 하는데, 지금은 탈퇴 기능이 없다. 기간을 정하고(예: 마지막 접속 후 1년)
   그때 지우는 편이 약속하기 쉽다.
2. **디바이스 기록을 얼마나 오래 둘 것인가.** 로그인하지 않은 사람의 연습 기록은
   주인을 특정할 수 없다. 짧게 두는 것이 안전하다.
3. **Supabase 리전.** 국내 이용자만 본다면 지연과 국외 이전 고지 양쪽에서
   가까운 리전이 유리하다.
4. **마이그레이션 관리 방식.** SQL Editor 에서 직접 칠 것인지, 저장소에
   마이그레이션 파일을 둘 것인지. 후자를 권한다 — 스키마가 코드 리뷰를 거친다.
