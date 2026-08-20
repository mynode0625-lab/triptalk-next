"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/Logo";
import {
  API_BASE, CLIENT_IDS, PROVIDERS, PROVIDER_KEYS, anyConfigured, isConfigured
} from "@/lib/auth/providers";
import {
  STATE_KEY, clearSession, formatTime, readSession, saveSession
} from "@/lib/auth/session";
import type { ProviderKey, Session } from "@/types/session";
import { PROVIDER_ICONS } from "./SocialIcons";

export function LoginApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<ProviderKey | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [toast, setToast] = useState<string>("");
  const [toastOn, setToastOn] = useState(false);
  const [demoNotice, setDemoNotice] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const initialised = useRef(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setToastOn(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 3200);
  }, []);

  /* ── 인가 코드 처리 (실제 로그인에서 되돌아왔을 때) ── */
  const handleOAuthCallback = useCallback(async (): Promise<boolean> => {
    const url = new URL(location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (!code && !error) return false;

    // 주소창에서 인가 코드를 지웁니다 (새로고침 시 재사용 방지)
    history.replaceState(null, "", location.pathname);

    if (error) { showToast("로그인이 취소되었습니다."); return false; }

    let saved: { state: string; provider: ProviderKey } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null"); } catch { /* 무시 */ }
    sessionStorage.removeItem(STATE_KEY);

    if (!saved || saved.state !== state) {
      showToast("로그인 요청이 유효하지 않습니다. 다시 시도해 주세요.");
      return false;
    }

    const { provider } = saved;
    setBusy(true);

    try {
      // 인가 코드 → 액세스 토큰 교환은 서버(Route Handler)에서만 할 수 있습니다.
      const res = await fetch(`${API_BASE}/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code, state,
          redirectUri: location.origin + location.pathname
        })
      });

      if (!res.ok) throw new Error(`토큰 교환 실패 (${res.status})`);

      const profile = (await res.json()) as { name?: string; email?: string };
      const next: Session = {
        provider,
        name: profile.name || PROVIDERS[provider].label + " 사용자",
        email: profile.email || "—",
        avatar: PROVIDERS[provider].avatar,
        loginAt: new Date().toISOString(),
        demo: false
      };
      saveSession(next);
      showToast(`${PROVIDERS[provider].label} 계정으로 로그인했습니다`);
      setSession(next);
      return true;
    } catch (err) {
      console.error("[TripTalk] OAuth 콜백 처리 실패:", err);
      showToast("로그인 처리 중 문제가 발생했습니다. 서버 설정을 확인해 주세요.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  /* ── 시작 ─────────────────────────────────────── */
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    // 설정된 서비스가 하나도 없으면 데모 모드임을 안내합니다.
    setDemoNotice(!anyConfigured());

    void (async () => {
      const handled = await handleOAuthCallback();
      if (handled) return;
      const s = readSession();
      if (s) setSession(s);
    })();

    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [handleOAuthCallback]);

  /* ── 소셜 로그인 ──────────────────────────────── */
  /** 실제 로그인: 각 서비스의 인가 페이지로 이동시킵니다. */
  const startRealLogin = (provider: ProviderKey) => {
    const meta = PROVIDERS[provider];
    const redirectUri = location.origin + location.pathname;

    // CSRF 방지용 state — 돌아왔을 때 같은 값인지 확인합니다.
    const state = crypto.randomUUID();
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, provider }));
    } catch { /* 무시 */ }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_IDS[provider],
      redirect_uri: redirectUri,
      state
    });
    if (meta.scope) params.set("scope", meta.scope);

    // 외부 OAuth 인가 페이지로 나가므로 Next 라우터가 아닌 전체 이동을 씁니다.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${meta.authUrl}?${params}`);
  };

  /** 데모 로그인: 실제 통신 없이 로그인 흐름만 재현합니다. */
  const startDemoLogin = (provider: ProviderKey) => {
    const meta = PROVIDERS[provider];
    setLoadingProvider(provider);
    setBusy(true);

    setTimeout(() => {
      setLoadingProvider(null);
      setBusy(false);
      const next: Session = {
        provider,
        name: meta.demo.name,
        email: meta.demo.email,
        avatar: meta.avatar,
        loginAt: new Date().toISOString(),
        demo: true
      };
      saveSession(next);
      showToast(`${meta.label} 계정으로 로그인했습니다 (데모)`);
      setSession(next);
    }, 900);
  };

  const onSocial = (provider: ProviderKey) => {
    if (isConfigured(provider)) startRealLogin(provider);
    else startDemoLogin(provider);
  };

  /* ── 이메일 로그인 — 서버가 없으므로 형식 검증만 하고 데모 세션을 만듭니다 ── */
  const onEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const mail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
      setFormError("이메일 주소를 다시 확인해 주세요.");
      return;
    }
    if (password.length < 8) {
      setFormError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    const next: Session = {
      provider: "email",
      name: mail.split("@")[0],
      email: mail,
      avatar: "📧",
      loginAt: new Date().toISOString(),
      demo: true
    };
    saveSession(next, remember);
    showToast("로그인했습니다 (데모)");
    setSession(next);
  };

  const onLogout = () => {
    clearSession();
    setEmail("");
    setPassword("");
    setSession(null);
    showToast("로그아웃되었습니다");
  };

  const noop = (e: React.MouseEvent) => {
    e.preventDefault();
    showToast("데모 사이트라 아직 준비되지 않은 화면입니다.");
  };

  const providerMeta = session && session.provider !== "email"
    ? PROVIDERS[session.provider]
    : null;

  return (
    <>
      <div className="auth">
        {/* ── 좌: 브랜드 패널 ───────────────────────── */}
        <aside className="auth__aside">
          <div className="auth__bg" aria-hidden="true">
            <div className="blob blob--1"></div>
            <div className="blob blob--2"></div>
            <div className="grid-lines"></div>
          </div>

          <div className="auth__aside-inner">
            <Logo href="/" variant="light" />

            <div className="auth__pitch">
              <h2>공항에서의 3분이<br />편안해지는 가장 빠른 길</h2>
              <ul className="auth__points">
                <li><span>🎭</span> AI 캐릭터 8명과 실전 역할극</li>
                <li><span>🗣</span> 타이핑 없이 소리 내어 말하기</li>
                <li><span>🩺</span> 발음 교정 + 표현 교정 리포트</li>
              </ul>
            </div>

            <figure className="auth__quote">
              <blockquote>&quot;입국심사에서 처음으로 안 얼었어요.&quot;</blockquote>
              <figcaption><b>김지현</b> · 3개월 사용 · 미국 서부</figcaption>
            </figure>
          </div>
        </aside>

        {/* ── 우: 로그인 폼 ─────────────────────────── */}
        <main className="auth__main">
          {!session ? (
            <section className="auth__card" id="loginCard">
              <Link href="/" className="auth__back">← 홈으로</Link>

              <header className="auth__head">
                <Badge>🧳 3일 무료 체험</Badge>
                <h1>다시 만나서 반가워요</h1>
                <p>소셜 계정으로 3초 만에 시작하세요.<br />비밀번호를 새로 만들 필요가 없습니다.</p>
              </header>

              <div className="social" id="socialButtons">
                {PROVIDER_KEYS.map(p => {
                  const Icon = PROVIDER_ICONS[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      className={
                        `social__btn social__btn--${p}` +
                        (loadingProvider === p ? " is-loading" : "")
                      }
                      data-provider={p}
                      disabled={busy}
                      onClick={() => onSocial(p)}
                    >
                      <span className="social__icon" aria-hidden="true"><Icon /></span>
                      <span className="social__label">
                        {p === "google" ? "Google로 시작하기" : `${PROVIDERS[p].label}로 시작하기`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="divider"><span>또는 이메일로</span></div>

              <form className="auth__form" id="emailForm" noValidate onSubmit={onEmailSubmit}>
                <label className="field">
                  <span className="field__label">이메일</span>
                  <input
                    type="email" id="email" name="email" placeholder="you@example.com"
                    autoComplete="email" required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span className="field__label">비밀번호</span>
                  <span className="field__wrap">
                    <input
                      ref={pwRef}
                      type={showPw ? "text" : "password"}
                      id="password" name="password" placeholder="8자 이상"
                      autoComplete="current-password" required minLength={8}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button" className="field__toggle" id="pwToggle"
                      aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                      onClick={() => { setShowPw(v => !v); pwRef.current?.focus(); }}
                    >
                      👁
                    </button>
                  </span>
                </label>

                <div className="auth__row">
                  <label className="check">
                    <input
                      type="checkbox" id="remember"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                    />
                    <span>로그인 상태 유지</span>
                  </label>
                  <a href="#" className="auth__link" onClick={noop}>비밀번호를 잊으셨나요?</a>
                </div>

                {formError ? (
                  <p className="auth__error" id="formError" role="alert">{formError}</p>
                ) : null}

                <button type="submit" className="btn btn--primary btn--block btn--lg">
                  이메일로 로그인
                </button>
              </form>

              <p className="auth__switch">
                아직 계정이 없으신가요? <a href="#" className="auth__link" onClick={noop}>회원가입</a>
              </p>

              <p className="auth__terms">
                계속 진행하면 TripTalk의 <a href="#" onClick={noop}>이용약관</a> 및{" "}
                <a href="#" onClick={noop}>개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
              </p>

              {demoNotice ? (
                <p className="auth__demo" id="demoNotice">
                  <b>데모 모드</b>
                  실제 소셜 로그인 키가 설정되지 않아 로그인 흐름만 시연합니다.
                  입력한 정보는 이 브라우저 밖으로 전송되지 않습니다.
                </p>
              ) : null}
            </section>
          ) : (
            <section className="auth__card auth__card--done" id="doneCard">
              <div className="done__avatar" id="doneAvatar">
                {session.avatar || providerMeta?.avatar || "🧳"}
              </div>
              <h1 className="done__title">
                환영합니다, <span id="doneName">{session.name || "여행자"}</span>님
              </h1>
              <p className="done__sub" id="doneSub">
                {session.demo
                  ? "데모 세션입니다. 이 브라우저에만 저장되었습니다."
                  : "이제 말하기 연습을 시작할 수 있습니다."}
              </p>

              <dl className="done__meta">
                <div>
                  <dt>로그인 방식</dt>
                  <dd id="doneProvider">{providerMeta ? `${providerMeta.label} 계정` : "이메일"}</dd>
                </div>
                <div><dt>이메일</dt><dd id="doneEmail">{session.email || "—"}</dd></div>
                <div><dt>로그인 시각</dt><dd id="doneAt">{formatTime(session.loginAt)}</dd></div>
              </dl>

              <div className="done__actions">
                <Link href="/practice" className="btn btn--primary btn--block btn--lg">
                  🎙 말하기 연습 시작
                </Link>
                <button
                  type="button" className="btn btn--outline btn--block" id="logoutBtn"
                  onClick={onLogout}
                >
                  로그아웃
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      <div
        className={"toast" + (toastOn ? " is-on" : "")}
        id="toast" role="status" aria-live="polite"
      >
        {toast}
      </div>
    </>
  );
}
