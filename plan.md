# TripTalk — Next.js 이전 계획

> 목표: 현재 순수 HTML/CSS/JS로 만들어진 TripTalk을 **기능 손실 없이 100%** Next.js로 이전한다.
> 작성일: 2026-08-19 · 원본 기준 커밋: `triptalk@0a199b1`
>
> **원본**: `~/ASC/builder` (저장소 `triptalk`) — 읽기 전용 참조
> **작업 대상**: `~/ASC/triptalk-next` (저장소 `triptalk-next`) — 이 문서가 있는 곳
> 세션은 두 폴더 모두 접근 가능한 `~/ASC`에서 여는 것을 권장한다.

---

## 1. 원칙

1. **무손실 이전이 최우선.** 리팩터링·기능 추가·디자인 개선은 이전이 끝난 뒤에 한다.
2. **화면과 동작은 픽셀·거동 단위로 동일해야 한다.** 이전 전후를 나란히 놓고 비교한다.
3. **단계마다 동작하는 상태를 유지한다.** 한 번에 전부 갈아엎지 않는다.
4. **이전 중 발견한 개선점은 코드가 아니라 문서에 적는다.** (본 문서 9장)

---

## 2. 이전 대상 전수 인벤토리

아래 목록이 곧 완료 판정 체크리스트다. 하나라도 빠지면 이전이 끝난 것이 아니다.

### 2.1 랜딩 페이지 — `index.html` + `script.js`(624줄) + `style.css`(644줄)

| # | 기능 | 비고 |
|---|---|---|
| L-01 | 고정 헤더 · 스크롤 시 배경 전환(`is-stuck`) | |
| L-02 | 모바일 햄버거 내비 토글 | |
| L-03 | 현재 섹션 내비 하이라이트 | 스크롤 스파이 |
| L-04 | 히어로 · 배경 blob 애니메이션 + 그리드 | |
| L-05 | 히어로 폰 목업 **채팅 자동 재생** | 타이핑 연출 |
| L-06 | 통계 숫자 **카운트업** 4종 | 뷰포트 진입 시 |
| L-07 | 스크롤 등장 애니메이션(`.reveal`) | IntersectionObserver |
| L-08 | 문제 제기 3카드 | 정적 |
| L-09 | 특징 5카드 (2개는 wide) | 정적 |
| L-10 | **AI 캐릭터 8명** 카드 · 클릭 시 첫 마디 TTS 재생 | 데이터 `CHARACTERS` |
| L-11 | **상황별 학습 탭 5종** (airport/hotel/food/city/trouble) | 데이터 `SITUATIONS` |
| L-12 | **인터랙티브 데모** — 시나리오 선택 + 선택지 분기 대화 + 다시 시작 | 데이터 `DEMO` |
| L-13 | 이용 방법 3단계 | 정적 |
| L-14 | 사용자 후기 4개 | 정적 |
| L-15 | 요금제 3종 + **월간/연간 토글** (가격 치환) | |
| L-16 | **FAQ 아코디언** | 데이터 `FAQS` |
| L-17 | CTA 이메일 폼 (형식 검증 + 안내 문구) | |
| L-18 | 푸터 3열 + 하단 정보 | |
| L-19 | 맨 위로 버튼 (스크롤 임계값) | |

### 2.2 말하기 연습실 — `practice.html` + `practice.js`(1255줄) + `practice.css`(405줄)

**이 파일이 이전 난이도의 90%를 차지한다.** 명령형 상태 기계로 작성돼 있어 React 상태 모델로 재설계가 필요하다.

| # | 기능 | practice.js 구획 |
|---|---|---|
| P-01 | **연습 시나리오 5종** (checkin / immigration / hotel / restaurant / taxi) | §1 |
| P-02 | **발음 교정 사전** — 한국인 취약 발음(r/l, th, f/v, 묵음, 강세) | §2 |
| P-03 | **표현 교정 규칙** — 정중함·관사·콩글리시 등 규칙 기반 | §3 |
| P-04 | 텍스트 비교 유틸 (정규화 · 토큰 diff · 유사도) | §4 |
| P-05 | **TTS 재생** — 내장 음성 + 저품질 음성 필터(BAD/GOOD_VOICE) | §5 |
| P-06 | **클라우드 TTS(선택)** — OpenAI `gpt-4o-mini-tts` / ElevenLabs `eleven_multilingual_v2` + 실패 시 폴백 + 오디오 캐시 | §5 |
| P-07 | **STT 음성 인식** — interimResults, maxAlternatives 3 | §5, §10 |
| P-08 | **입력 레벨 미터** (마이크 실시간 시각화) | §5 |
| P-09 | 상태 관리 · 옵션 영속화(`localStorage: triptalk_tts`) | §6 |
| P-10 | 환경 점검 — 미지원 브라우저 시 **타이핑 모드 자동 전환** | §7 |
| P-11 | 상황 선택 화면 | §8 |
| P-12 | 대화 진행 로직 · 진행률 바 | §9 |
| P-13 | **받아쓰기 확인 UI** — 사용자가 직접 수정 + 대안 3개 + 신뢰도 표시 | §10 |
| P-14 | **채점 · 피드백** — 발음 교정 + 표현 교정 결과 렌더 | §11 |
| P-15 | **사이드 패널 설정** — 속도, 한국어 표시, 자동재생, 보이스 선택, 클라우드 TTS 키 입력·테스트 | §12 |
| P-16 | 전역 클릭 핸들러 — 🔊 듣기 / 🎯 따라 말하기 / 해석 토글 | §13 |
| P-17 | **마무리 리포트** — 점수 / 턴 수 / 단어 수 / 교정 목록 + 다시하기 | §14 |
| P-18 | 상단 바 — 상황 바꾸기 / 리포트 열기 / 로그인 링크 | |
| P-19 | 힌트 영역 — 모범 표현 · 한국어 해석 토글 | |

### 2.3 로그인 — `login.html` + `login.js`(357줄) + `login.css`(272줄)

| # | 기능 |
|---|---|
| A-01 | 카카오 / 네이버 / Google 소셜 버튼 (브랜드 가이드 색상 + 공식 로고 SVG) |
| A-02 | OAuth 인가 리다이렉트 (`response_type=code`) |
| A-03 | **state 기반 CSRF 방지** + 콜백 후 주소창 인가코드 제거 |
| A-04 | 콜백 처리 → `POST {apiBase}/{provider}` 토큰 교환 |
| A-05 | **데모 모드 폴백** (키 미설정 시 흐름만 시연) |
| A-06 | 이메일 로그인 폼 — 형식 검증 · 비밀번호 표시 토글 · 로그인 유지 |
| A-07 | 세션 저장/복원/삭제 (`localStorage` / `sessionStorage`) |
| A-08 | 로그인 완료 카드 (프로필 · 로그인 방식 · 시각) + 로그아웃 |
| A-09 | 토스트 알림 |
| A-10 | 좌측 브랜드 패널 (그라데이션 · 후기 · 반응형 붕괴) |

### 2.4 공통

- 디자인 토큰 (`:root` 변수 20여 개), 리셋, `.btn` 계열, `.container`, `.badge`, `.logo`
- 반응형 브레이크포인트 (900px / 420px 등)
- `prefers-reduced-motion` 대응
- iOS 입력 확대 방지 (`font-size: max(16px, 1rem)`)

---

## 3. 기술 스택 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 프레임워크 | **Next.js 16.3.1 · App Router** | 최신 안정 버전(2026-08-19 확인). Route Handlers로 OAuth 서버 확보 |
| React | **19.x** | Next 16 요구사항 |
| Node | **20.9 이상** (로컬 v24.19.0) | Next 16 `engines` 요구사항 |
| 언어 | **TypeScript** | 시나리오·교정 규칙 등 데이터 구조가 복잡해 타입이 큰 이득 |
| 스타일 | **기존 CSS 그대로 이식 → 이후 선택적 모듈화** | 아래 참조 |
| 상태 관리 | **React 내장 (useState / useReducer / Context)** | 외부 라이브러리 불필요한 규모 |
| 배포 | **Vercel** (신규 프로젝트) | 검증 후 기존 `triptalk` 배포를 대체 |

### 스타일 전략 — Tailwind를 쓰지 않는 이유

기존 CSS 1,321줄은 디자인 토큰과 커스텀 애니메이션이 촘촘히 짜인 **완성된 디자인 시스템**이다. Tailwind로 바꾸는 것은 이전이 아니라 재작성이며, "기능 손실 없이"라는 목표와 정면으로 충돌한다.

- **1단계**: `style.css` → `app/globals.css`로 통째 이식, `practice.css` / `login.css`는 해당 레이아웃에서 import. 클래스명 그대로 → **이식 리스크 0**
- **2단계(선택)**: 동작 검증이 끝난 뒤 페이지별 CSS Modules로 점진 분리

### Next.js로 얻는 것 — 소셜 로그인 완성

현재 정적 사이트의 최대 제약은 **클라이언트 시크릿을 둘 서버가 없어 실제 OAuth를 완성할 수 없다**는 점이었다. Next.js Route Handlers(`app/api/auth/[provider]/route.ts`)가 이 문제를 그대로 해결한다. 이전의 가장 큰 실익이다.

---

## 4. 프로젝트 구조

> 2026-08-19 갱신 — 애플리케이션 코드는 `src/` 로 묶었다. 설정 파일과 `public/` 은 루트에 남는다.
> `@/*` 별칭은 `src/*` 를 가리킨다.

```
triptalk-next/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                 # 루트 레이아웃 · globals.css · 메타데이터
│  │  ├─ page.tsx                   # 랜딩
│  │  ├─ globals.css                # ← style.css (토큰 + 공통 + 랜딩)
│  │  ├─ practice/                  # practice.css + 연습실 페이지
│  │  ├─ login/                     # login.css + 로그인 페이지
│  │  └─ api/
│  │     ├─ auth/[provider]/route.ts   # OAuth 토큰 교환 (신규)
│  │     └─ tts/route.ts               # 서버 TTS (신규)
│  │
│  ├─ components/
│  │  ├─ landing/                   # Header, Hero, Characters, Situations,
│  │  │                             # Demo, Pricing, Faq, Cta, Footer, ToTop
│  │  ├─ practice/                  # SetupScreen, CharacterStage, MicBar,
│  │  │                             # ConfirmBar, FeedbackStrip, SidePanel, Report
│  │  ├─ login/                     # LoginApp, SocialIcons
│  │  └─ ui/                        # Button, Badge, Logo, Container
│  │
│  ├─ lib/
│  │  ├─ data/                      # characters.ts, situations.ts, faqs.ts,
│  │  │                             # demo.ts, hero.ts, scenarios.ts
│  │  ├─ speech/                    # engine.ts, useSpeechRecognition.ts,
│  │  │                             # useMicLevel.ts, ttsStore.ts
│  │  ├─ correction/                # pronunciation.ts, expression.ts, textDiff.ts
│  │  ├─ hooks/                     # useReducedMotion, useCountUp, useEnvSupport
│  │  └─ auth/                      # session.ts, providers.ts
│  │
│  └─ types/                        # landing.ts, practice.ts, session.ts
│
└─ public/                          # 파비콘 등 (루트 유지)
```

---

## 5. 단계별 작업 계획

### Phase 0 — 스캐폴딩 (0.5일) ✅ **완료 (2026-08-19)**

- [x] `npx create-next-app@latest` → **Next 16.3.1** (TypeScript, App Router, ESLint, src 미사용, Tailwind 제외)
- [x] Node 확인 — v24.19.0 (요구 20.9+ 충족), React 19.2.8
- [x] **별도 저장소 `triptalk-next` 생성 (Private)** — 기존 `triptalk`은 손대지 않아 현재 사이트가 계속 살아 있음
- [x] `npm run build` 통과 확인
- [ ] 루트 레이아웃 · 메타데이터 · 파비콘 이식 → **Phase 1로 이월**
- **완료 기준**: `npm run build` 성공 ✅

### Phase 1 — 디자인 시스템 이식 (0.5일) ✅ **완료 (2026-08-19)**

- [x] `style.css` → `app/globals.css` 이식, `layout.tsx`에서 import
- [x] `practice.css` / `login.css` → 각 하위 레이아웃에서 import
- [x] 공통 UI 컴포넌트 추출: `Button`, `Logo`, `Badge`, `Container`
- [x] 루트 레이아웃 · 메타데이터 · 파비콘 이식 (Phase 0에서 이월)
- **완료 기준**: 토큰·버튼·타이포가 기존과 동일하게 렌더 ✅ (캡처 대조 통과)

### Phase 2 — 데이터 레이어 (1일) ✅ **완료 (2026-08-19)**

- [x] `types/` 에 타입 정의 — `landing.ts` / `practice.ts` / `session.ts`
- [x] `script.js`의 `CHARACTERS` / `SITUATIONS` / `FAQS` / `DEMO` → `lib/data/*.ts`
- [x] `practice.js` §1 시나리오 5종 → `lib/data/scenarios.ts`
- [x] `practice.js` §2 발음 사전, §3 표현 규칙 → `lib/correction/*.ts`
- [x] `practice.js` §4 텍스트 비교 유틸 → `lib/correction/textDiff.ts`
- [ ] textDiff **단위 테스트** — 테스트 러너 미도입으로 보류 (10장으로 이월)
- **완료 기준**: 데이터가 타입 체크를 통과하고 원본과 1:1 일치 ✅
  (캐릭터 8 · 상황 5탭×6 · FAQ 6 · 데모 3×3턴 · 시나리오 5×5턴 개수 대조)

### Phase 3 — 랜딩 페이지 (2일) ✅ **완료 (2026-08-19)**

- [x] 섹션별 컴포넌트 분리 (L-01 ~ L-19)
- [x] 정적 섹션은 **서버 컴포넌트**로 (문제제기·특징·이용방법·후기·푸터·히어로 카피)
- [x] 인터랙션 섹션만 `'use client'` (헤더·히어로채팅·카운트업·캐릭터·탭·데모·요금제·FAQ·CTA·맨위로)
- [x] `IntersectionObserver` 기반 reveal / 카운트업 → `RevealObserver`, `useCountUp`
- **완료 기준**: 인벤토리 L-01~L-19 전부 동작 ✅, 기존 페이지와 캡처 비교 통과 ✅

### Phase 4 — 음성 엔진 (2일) ⚠️ 최난이도 ✅ **완료 (2026-08-19)**

- [x] `lib/speech/engine.ts` — 보이스 비동기 로딩(`voiceschanged`), BAD/GOOD_VOICE 필터, 속도·피치,
      Chrome `cancel()→speak()` 버그 우회와 keep-alive 까지 그대로 이식
- [x] `useSpeechRecognition` — interim 결과, 대안 3개, 시작/중지, 에러 메시지 매핑
- [x] `useMicLevel` — AudioContext 기반 레벨 미터, **언마운트 시 트랙·컨텍스트 해제**
- [x] 클라우드 TTS — OpenAI / ElevenLabs 호출 + blob 캐시 + 실패 시 내장 음성 폴백 (engine 내부)
- [x] **SSR 가드**: 엔진은 `getEngine()` 지연 생성, 브라우저 판정은 `useSyncExternalStore`
      (서버 스냅숏 `null`) 로 처리해 hydration 불일치 0
- **완료 기준**: 연습실에서 5개 시나리오 재생·인식·미터 동작 확인 ✅

### Phase 5 — 연습실 (3일) ⚠️ 최난이도 ✅ **완료 (2026-08-19)**

- [x] 상태 모델 재설계 — `setup → stage(대화 → 받아쓰기 확인 → 피드백) → report`
      전이를 `PracticeApp` 의 파생 상태로 정리 (메시지·카드는 배열 렌더)
- [x] 화면 컴포넌트 분리 (P-11 ~ P-19) — TopBar / SetupScreen / ChatView / Hint /
      ConfirmBar / MicBar / SidePanel / ReportModal
- [x] 채점·피드백 로직 이식 (P-14) — 발음 점수, 발음 교정, 표현 교정, 칭찬, 핵심 누락, 따라 말하기
- [x] 사이드 패널 · 옵션 영속화 (P-15, P-09) — `lib/speech/ttsStore.ts`
- [x] 미지원 브라우저 타이핑 모드 (P-10)
- [x] 마무리 리포트 (P-17)
- [x] 전역 클릭 위임(§13) → `ToolsContext` + `SpeakButton` / `ShadowButton` 로 대체
- **완료 기준**: 5턴 시나리오 완주 → 리포트 수치 일치 확인 ✅

### Phase 6 — 로그인 + 실제 OAuth (1.5일) ✅ **코드 완료 (2026-08-19)**

- [x] 로그인 UI 이식 (A-01, A-06, A-08, A-09, A-10)
- [x] 세션 유틸 `lib/auth/session.ts` (A-07)
- [x] **Route Handler 신규 구현** `app/api/auth/[provider]/route.ts`
      — 인가코드 → 토큰 교환 → 프로필 조회 → 정규화 응답 (카카오/네이버/Google)
- [x] 환경변수 정리 — `.env.example` 참고.
      클라이언트 ID 는 `NEXT_PUBLIC_*`, 시크릿은 서버 전용
- [ ] 각 개발자 콘솔에 Redirect URI(`/login`) 등록 — **외부 작업, 키 발급 후 진행**
- [x] 데모 모드 폴백 유지 (A-05) — 키가 없으면 안내 문구와 함께 흐름만 시연
- **완료 기준**: 키 없을 때 데모 모드 정상 ✅ / 실제 3개 제공자 로그인은 키 발급 후 확인 필요

### Phase 7 — 검증 · 배포 전환 (1일)

- [x] 7장 체크리스트 중 **기능·품질·반응형** 항목 통과 (Chromium 기준)
- [ ] Safari / Firefox / iOS Safari 실기기 확인 — **남은 작업**
- [ ] Lighthouse 비교 (성능·접근성 회귀 없을 것)
- [ ] `triptalk-next` 저장소를 Vercel 신규 프로젝트로 연결
- [ ] 저장소를 Public으로 전환 (배포 시점에)
- [ ] 검증 후 기존 `triptalk` 배포를 대체 — 도메인 이전 또는 기존 프로젝트 정리
- [x] ~~GitHub Pages 처리 결정~~ — **중단 완료(2026-08-19).** 배포처는 Vercel 단독

**총 예상: 11.5일** (1인 기준, 검증 포함)
**실제: Phase 0~6 코드 완료 (2026-08-19).** 남은 것은 Phase 7의 크로스 브라우저 실기기 검증과 배포 전환.

---

## 5.1 이전 중 내린 판단 (원본과 다른 점)

무손실이 원칙이지만, Next.js/React 로 옮기면서 **불가피하거나 명백히 이득인** 결정이 몇 개 있었다.
화면과 동작은 모두 동일하다.

| # | 원본 | 새 코드 | 이유 |
|---|---|---|---|
| 1 | `<body class="practice-body">` / `auth-body` | `body:has(.practice-page)` / `body:has(.auth)` | App Router 는 루트 레이아웃이 `<body>` 를 소유한다. `:has()` 로 바꾸면 JS 없이 SSR 시점부터 배경색이 맞아 깜빡임이 없다. 두 클래스가 하던 일은 `background` 하나뿐이다. |
| 2 | `.html` 링크 (`practice.html`) | 라우트 경로 (`/practice`) | App Router 규칙 |
| 3 | `login.js` 의 `AUTH_CONFIG.clientId` 하드코딩 | `NEXT_PUBLIC_*` 환경변수 | 키를 코드에 두지 않기 위해. 비어 있으면 원본과 똑같이 데모 모드 |
| 4 | 마이크 스트림·AudioContext 를 해제하지 않음 | 언마운트 시 트랙 stop + context close | 9장 리스크표의 "마이크·오디오 리소스 누수" 대응 |
| 5 | 마이크 버튼이 `synth.cancel()` 만 호출 | `engine.cancel()` (클라우드 오디오도 정지) | 원본 주석이 명시한 의도("말하기 버튼을 누르면 재생 중인 음성은 자동으로 멈춥니다")를 클라우드 음성에도 적용 |
| 6 | 로컬 서버 안내 경고 배너 | HTTPS/localhost 안내로 문구 변경 | `python3 -m http.server` 안내가 Next 프로젝트에서는 맞지 않는다 |
| 7 | 채팅 속 "해석 보기" 토글이 설정 화면 체크박스와 따로 놈 | 같은 상태를 공유 | React 상태 일원화. 사용자가 보는 결과는 항상 일치 |

**그대로 남긴 원본 동작 하나** — `🎯 따라 말하기` 를 누르면 원본은 "목표 문장: …" 을 잠깐 넣었다가
곧바로 `setMicEnabled(true)` 가 기본 안내로 덮어쓴다. 호출 순서를 그대로 옮겨 화면 결과도 동일하다.
(`components/practice/PracticeApp.tsx` 의 `shadow()` 주석 참고)

---

## 6. 핵심 기술 과제

### 6.1 Web Speech API와 SSR — 가장 큰 함정

`window.SpeechRecognition`, `window.speechSynthesis`, `AudioContext`는 **서버에 존재하지 않는다.** 서버 렌더링 중 접근하면 즉시 크래시한다.

**대응**
- 음성을 쓰는 컴포넌트는 전부 `'use client'`
- API 접근은 반드시 `useEffect` 내부에서 (렌더 중 접근 금지)
- 지원 여부 상태는 초기값 `null`(판정 전) → 마운트 후 확정. **`false`로 시작하면 hydration 불일치 발생**
- `speechSynthesis.getVoices()`는 비동기 → `voiceschanged` 이벤트 구독 필수

### 6.2 명령형 → 선언형 재설계

`practice.js`는 DOM을 직접 조작하는 명령형 코드다. React로 옮길 때 **1:1 번역이 아니라 상태 모델 재설계**가 필요하다.

- 화면 전이를 `useReducer` 액션으로 정리
- `innerHTML` 조립 → 컴포넌트 + 배열 렌더
- 전역 클릭 위임(§13) → 각 컴포넌트의 onClick
- **가장 버그가 나기 쉬운 구간이므로 Phase 5에 충분한 시간을 배정**

### 6.3 정리(cleanup) 누락

`AudioContext`, `MediaStream`, `SpeechRecognition`, `URL.createObjectURL`은 언마운트 시 반드시 해제해야 한다. 누락 시 마이크가 계속 켜져 있거나 메모리가 샌다. 모든 훅에 `useEffect` cleanup을 강제한다.

### 6.4 localStorage 접근

`localStorage`도 서버에 없다. 읽기는 `useEffect`에서, 초기 렌더는 기본값으로 처리한다.

---

## 7. 완료 검증 체크리스트

**기능** — 2장 인벤토리의 L-01~19, P-01~19, A-01~10 **전 항목** 수동 확인

**브라우저**
- [ ] Chrome (음성 인식 정상)
- [ ] Safari (음성 인식 정상)
- [ ] Firefox (**타이핑 모드로 자동 전환** 확인)
- [ ] iOS Safari (마이크 권한 · 입력 확대 없음)

**반응형**
- [ ] 1280px / 900px / 390px 에서 레이아웃 붕괴 없음

**품질**
- [ ] 콘솔 에러 0
- [ ] hydration 경고 0
- [ ] `npm run build` 경고 없이 성공
- [ ] 마이크가 사용 후 확실히 해제되는지 (브라우저 탭 표시로 확인)

**회귀 비교**
- [ ] 기존 사이트와 새 사이트를 나란히 띄우고 주요 화면 캡처 비교

---

## 8. 배포 전환

1. `triptalk-next`를 Vercel 신규 프로젝트로 연결 → **프리뷰 배포**로 먼저 검증
2. 환경변수 등록 (OAuth 시크릿 6종)
3. 각 OAuth 콘솔의 Redirect URI를 새 도메인으로 갱신
4. 검증 통과 후 프로덕션 전환 — 기존 `triptalk-chi.vercel.app` 대체
5. 구 저장소 `triptalk`는 아카이브 또는 참조용 보존 (삭제하지 않는다)
5. ~~GitHub Pages 중단~~ — **2026-08-19 완료.** Route Handler(소셜 로그인)와 정적 export가 양립하지 않아 Vercel 단일 배포로 정리함

---

## 9. 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| `practice.js` 상태 기계 재설계에서 미묘한 동작 차이 발생 | 높음 | Phase 5에 3일 배정, 시나리오 5종 전부 완주 테스트 |
| Web Speech API SSR 크래시 / hydration 불일치 | 높음 | 6.1 지침 준수, 훅 단위 선검증(Phase 4) |
| 마이크·오디오 리소스 누수 | 중간 | 모든 훅 cleanup 강제, 탭 표시로 육안 확인 |
| CSS 이식 중 레이아웃 미세 깨짐 | 중간 | 클래스명 유지 전략, 캡처 비교 |
| OAuth 콘솔 설정(키 발급·Redirect URI)이 외부 의존 | 중간 | 데모 모드 폴백을 유지해 키 없이도 진행 가능하게 |
| 일정 초과 | 중간 | Phase 6(로그인)은 분리 가능 — 최악의 경우 후속 작업으로 미룸 |

---

## 9.5 이전 이후 변경 이력

무손실 이전(Phase 0~6)이 끝난 뒤 요청으로 반영한 기능 변경을 여기에 남긴다.
2장 인벤토리는 "이전 시점의 원본 기준"이므로 수정하지 않는다.

### 2026-08-19 · 연습실을 캐릭터 1:1 대화 화면으로 (P-12 / P-16 / P-19 변경)

**요청** — 대화 연습이 텍스트 위주라 캐릭터와 1:1로 말하는 느낌으로 바꾸고 싶다.
캐릭터가 말할 때 영어 자막은 사용자가 선택했을 때만 보이게 한다. **피드백은 그대로 유지.**

| 항목 | 이전 | 지금 |
|---|---|---|
| 대화 화면 | 채팅 로그 (`.talk__chat`) | 캐릭터 무대 (`CharacterStage`) — 큰 아바타 + 지금 대사 하나 |
| 영어 자막 | 항상 인쇄 | **기본 꺼짐.** `👁 영어 자막 보기` 로 이번 턴만 펼치거나, 설정의 `영어 자막 항상 보기` 로 고정 |
| 한글 해석 | 토글 (기본 켜짐) | 토글 (**기본 꺼짐**) |
| 지금 대사 | 로그 안에서 스크롤됨 | `position: sticky` 로 상단 고정 — 피드백을 읽는 동안에도 계속 보임 |
| 내 답변 + 피드백 | 로그에 계속 쌓임 | 직전 것을 `FeedbackStrip` 으로 무대 아래 표시. **카드 구성·문구·판정 로직은 그대로** |
| 지난 대화 | 항상 펼쳐진 로그 | `TranscriptLog` 접이식 (`지난 대화 · 피드백 n`) — 내용은 기존 `ChatView` 그대로 |
| 재생 표시 | 없음 | 음성 재생 중 아바타에 링이 퍼짐 (`is-speaking`) |

**바꾸지 않은 것** — 채점 공식, 발음/표현 교정 규칙, 카드 문구, 사이드 패널, 마무리 리포트,
힌트·받아쓰기 확인·마이크 바, 턴 사이 대기 시간(900ms/700ms).

**영어 자막과 한글 해석 모두 기본으로 꺼져 있다.** 캐릭터의 말은 먼저 귀로 듣고,
못 알아들었을 때만 `👁 영어 자막 보기` 또는 `해석 보기` 로 확인한다.
무엇을 말해야 하는지는 아래 힌트 영역(`💬 이렇게 답해보세요`)이 한국어로 계속 안내하므로
자막이 없어도 대화는 막히지 않는다.

### 2026-08-19 · 요금 정책 문구 조정

- 무료 체험 **7일 → 3일**. Free 요금제가 이미 "기본 상황 5개 · 하루 대화 3회"를 영구 무료로
  주고 있어 맛보기 역할은 Free 가 맡는다. 체험은 Traveler 프리미엄 기능을 잠깐 여는 성격이라
  길 이유가 없고, 3일이면 복기 리포트가 쌓이는 루프를 한 바퀴 돌 수 있다.
  (`Pricing`, `Cta`, `LoginApp` 배지, FAQ 답변 — 총 6곳)
- **결제 후 7일 이내 환불 조항은 유지.** 체험이 짧아진 만큼 결제 직후 이탈 경로로서 더 중요해졌다.
- 향후 검토 — 기간 대신 **횟수 기반**("상황 3개 무료")이 이 제품에 더 맞을 수 있다.
  가입만 하고 방치해 체험을 날리는 일이 없고 콘텐츠 소진량도 정확히 통제된다.

### 2026-08-19 · 영어 발음 자연스럽게 (P-05 / P-06 보강)

**요청** — 발음이 기계 티가 난다. 더 사람처럼, 미국식으로.

**원인** — 브라우저 내장 음성은 기기에 설치된 음성 품질이 전부다. 확인해 보니 작업 기기에는
애플 **기본** 음성만 있었고(향상됨/프리미엄 미설치) 쓸 만한 미국 음성은 구형 `Samantha` 하나뿐이었다.
코드로는 이 음성을 사람처럼 만들 수 없다.

| 조치 | 내용 |
|---|---|
| 서버 TTS 신설 | `app/api/tts/route.ts` — 서버에 `OPENAI_API_KEY` 하나만 두면 방문자가 각자 키를 넣지 않아도 자연스러운 미국식 발음이 나온다. `GET` 은 가용 여부만(무비용) 알려준다 |
| 재생 우선순위 | 개인 키 → 서버 TTS → 브라우저 내장 음성 순으로 자동 폴백 |
| 미국식 우선 강화 | `rankVoice` 의 지역 일치 가산을 100→140, 타 영어권을 55→40 으로 벌려 미국 상황에서 영국·호주·인도 억양이 뽑히지 않게 함 |
| **한글 macOS 대응** | 고품질 음성 판별에 `향상`·`프리미엄`·`고급` 라벨 추가. 기존 정규식이 영어 단어만 봐서, 한글 macOS 에서 애써 설치한 고품질 음성이 기본 음성과 같은 점수를 받던 문제 |
| 안내 노출 | 기기에 고품질 음성이 하나도 없으면 상황 선택 화면에 안내를 띄운다. 접힌 패널 안에만 있던 설치법을 밖으로 꺼냄 |

**영국식 Aisha(호텔)는 그대로 뒀다.** 시나리오 설명과 카드 배지에 "영국식"이 명시된 의도된 설정이라,
미국식으로 바꾸면 기능이 하나 사라진다. 바꾸려면 `lib/data/scenarios.ts` 의 `hotel.char.lang` 과
`voice.inst`, 설명 문구를 함께 고쳐야 한다.

---

## 10. 이전 이후 과제 (지금은 하지 않는다)

- CSS Modules 점진 분리
- 실제 AI 대화 연동 (Claude / GPT) — 현재는 시나리오 스크립트 기반
- 사용자 학습 기록 서버 저장 (현재 localStorage)
- 랜딩 페이지의 예시 수치(이용자 수·후기·요금)를 데모임을 명시하도록 정리
- 테스트 자동화 (Playwright E2E) 및 `textDiff` 단위 테스트 (Phase 2에서 이월)
- `/api/tts` 호출 제한 — 공개 배포 시 남용되면 OpenAI 비용이 그대로 나간다
- `🎯 따라 말하기` 의 "목표 문장" 안내가 즉시 덮어쓰이는 원본 동작 정리 (5.1 참고)
