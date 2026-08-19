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

```
triptalk-next/
├─ app/
│  ├─ layout.tsx                 # 루트 레이아웃 · globals.css · 메타데이터
│  ├─ page.tsx                   # 랜딩
│  ├─ globals.css                # ← style.css (토큰 + 공통 + 랜딩)
│  ├─ practice/
│  │  ├─ layout.tsx              # practice.css import
│  │  └─ page.tsx                # 연습실 (클라이언트 컴포넌트 트리)
│  ├─ login/
│  │  ├─ layout.tsx              # login.css import
│  │  └─ page.tsx
│  └─ api/auth/[provider]/route.ts   # OAuth 토큰 교환 (신규)
│
├─ components/
│  ├─ landing/                   # Header, Hero, Characters, Situations,
│  │                             # Demo, Pricing, Faq, Cta, Footer, ToTop
│  ├─ practice/                  # SetupScreen, ChatView, MicButton,
│  │                             # ConfirmBar, Feedback, SidePanel, Report
│  └─ ui/                        # Button, Badge, Toast, Logo
│
├─ lib/
│  ├─ data/                      # characters.ts, situations.ts, faqs.ts,
│  │                             # demo.ts, scenarios.ts
│  ├─ speech/                    # useSpeechRecognition.ts, useSpeechSynthesis.ts,
│  │                             # cloudTts.ts, useMicLevel.ts
│  ├─ correction/                # pronunciation.ts, expression.ts, textDiff.ts
│  └─ auth/                      # session.ts, providers.ts
│
├─ types/                        # scenario.ts, session.ts, correction.ts
└─ public/
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

### Phase 1 — 디자인 시스템 이식 (0.5일)

- [ ] `style.css` → `app/globals.css` 이식, `layout.tsx`에서 import
- [ ] `practice.css` / `login.css` → 각 하위 레이아웃에서 import
- [ ] 공통 UI 컴포넌트 추출: `Button`, `Logo`, `Badge`, `Container`
- **완료 기준**: 토큰·버튼·타이포가 기존과 동일하게 렌더

### Phase 2 — 데이터 레이어 (1일)

- [ ] `types/` 에 타입 정의 — `Character`, `Situation`, `Faq`, `DemoScenario`, `Scenario`, `Turn`, `Correction`
- [ ] `script.js`의 `CHARACTERS` / `SITUATIONS` / `FAQS` / `DEMO` → `lib/data/*.ts`
- [ ] `practice.js` §1 시나리오 5종 → `lib/data/scenarios.ts`
- [ ] `practice.js` §2 발음 사전, §3 표현 규칙 → `lib/correction/*.ts`
- [ ] `practice.js` §4 텍스트 비교 유틸 → `lib/correction/textDiff.ts` + **단위 테스트**
- **완료 기준**: 데이터가 타입 체크를 통과하고 원본과 1:1 일치 (개수 대조)

### Phase 3 — 랜딩 페이지 (2일)

- [ ] 섹션별 컴포넌트 분리 (L-01 ~ L-19)
- [ ] 정적 섹션은 **서버 컴포넌트**로 (문제제기·특징·이용방법·후기·푸터)
- [ ] 인터랙션 섹션만 `'use client'` (헤더·히어로채팅·카운트업·캐릭터·탭·데모·요금제·FAQ·CTA·맨위로)
- [ ] `IntersectionObserver` 기반 reveal / 카운트업 → 커스텀 훅 `useReveal`, `useCountUp`
- **완료 기준**: 인벤토리 L-01~L-19 전부 동작, 기존 페이지와 나란히 비교 통과

### Phase 4 — 음성 엔진 (2일) ⚠️ 최난이도

- [ ] `useSpeechSynthesis` — 보이스 목록 비동기 로딩, BAD/GOOD_VOICE 필터, 속도·피치
- [ ] `useSpeechRecognition` — interim 결과, 대안 3개, 시작/중지, 에러 처리
- [ ] `useMicLevel` — AudioContext 기반 레벨 미터, 언마운트 시 정리
- [ ] `cloudTts.ts` — OpenAI / ElevenLabs 호출 + 캐시 + 실패 폴백
- [ ] **SSR 가드**: `typeof window === 'undefined'` 분기, 필요 시 `dynamic(..., { ssr: false })`
- **완료 기준**: 각 훅을 단독 테스트 페이지에서 검증

### Phase 5 — 연습실 (3일) ⚠️ 최난이도

- [ ] 상태 모델 설계 — `useReducer`로 `setup → practicing → confirming → feedback → report` 전이
- [ ] 화면 컴포넌트 분리 (P-11 ~ P-19)
- [ ] 채점·피드백 로직 이식 (P-14)
- [ ] 사이드 패널 · 옵션 영속화 (P-15, P-09)
- [ ] 미지원 브라우저 타이핑 모드 (P-10)
- [ ] 마무리 리포트 (P-17)
- **완료 기준**: 5개 시나리오를 처음부터 끝까지 완주, 리포트 수치가 기존과 일치

### Phase 6 — 로그인 + 실제 OAuth (1.5일)

- [ ] 로그인 UI 이식 (A-01, A-06, A-08, A-09, A-10)
- [ ] 세션 유틸 `lib/auth/session.ts` (A-07)
- [ ] **Route Handler 신규 구현** `app/api/auth/[provider]/route.ts`
      — 인가코드 → 토큰 교환 → 프로필 조회 → 정규화 응답
- [ ] 환경변수: `KAKAO_CLIENT_ID/SECRET`, `NAVER_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`
- [ ] 각 개발자 콘솔에 Redirect URI 등록
- [ ] 데모 모드 폴백 유지 (A-05) — 키가 없어도 화면은 동작해야 함
- **완료 기준**: 3개 제공자 실제 로그인 성공, 키 없을 때 데모 모드 정상

### Phase 7 — 검증 · 배포 전환 (1일)

- [ ] 7장 체크리스트 전수 통과
- [ ] Lighthouse 비교 (성능·접근성 회귀 없을 것)
- [ ] `triptalk-next` 저장소를 Vercel 신규 프로젝트로 연결
- [ ] 저장소를 Public으로 전환 (배포 시점에)
- [ ] 검증 후 기존 `triptalk` 배포를 대체 — 도메인 이전 또는 기존 프로젝트 정리
- [x] ~~GitHub Pages 처리 결정~~ — **중단 완료(2026-08-19).** 배포처는 Vercel 단독

**총 예상: 11.5일** (1인 기준, 검증 포함)

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

## 10. 이전 이후 과제 (지금은 하지 않는다)

- CSS Modules 점진 분리
- 실제 AI 대화 연동 (Claude / GPT) — 현재는 시나리오 스크립트 기반
- 사용자 학습 기록 서버 저장 (현재 localStorage)
- 랜딩 페이지의 예시 수치(이용자 수·후기·요금)를 데모임을 명시하도록 정리
- 테스트 자동화 (Playwright E2E)
