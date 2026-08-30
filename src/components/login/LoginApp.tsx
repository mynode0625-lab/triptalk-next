"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/Logo";
import {
  API_BASE, CLIENT_IDS, PROVIDERS, PROVIDER_KEYS, isConfigured
} from "@/lib/auth/providers";
import { STATE_KEY, fetchSession, formatTime, logout } from "@/lib/auth/session";
import type { ProviderKey, Session } from "@/types/session";
import { PROVIDER_ICONS } from "./SocialIcons";

export function LoginApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<ProviderKey | null>(null);
  const [toast, setToast] = useState<string>("");
  const [toastOn, setToastOn] = useState(false);
  /** 키가 없어 데모로 동작하는 서비스 목록 — 서버에 물어볼 것 없이 공개 ID 로 판단합니다 */
  const [demoProviders, setDemoProviders] = useState<ProviderKey[]>([]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

      // 로그인의 근거는 이 응답이 아니라 서버가 함께 내려준 세션 쿠키입니다.
      // 화면에 뿌릴 값만 받아 씁니다.
      const { session: next } = (await res.json()) as { session: Session };
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

    // 키가 없는 서비스는 데모로 동작합니다 — 화면에 그대로 밝힙니다.
    setDemoProviders(PROVIDER_KEYS.filter(p => !isConfigured(p)));

    void (async () => {
      const handled = await handleOAuthCallback();
      if (handled) return;
      const s = await fetchSession();
      if (s) setSession(s);
    })();

    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [handleOAuthCallback]);

  /* ── 신한 SOL 로그인 ──────────────────────────── */
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

  /**
   * 데모 로그인: 외부 통신 없이 흐름만 재현합니다.
   * 세션은 여기서 만들지 않고 서버에 요청합니다 — 실제 키가 설정된 서비스라면
   * 서버가 409 로 거절하므로, 데모로 진짜 로그인을 우회할 수 없습니다.
   */
  const startDemoLogin = async (provider: ProviderKey) => {
    const meta = PROVIDERS[provider];
    setLoadingProvider(provider);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider })
      });
      if (!res.ok) throw new Error(`데모 세션 발급 실패 (${res.status})`);
      const { session: next } = (await res.json()) as { session: Session };
      showToast(`${meta.label} 계정으로 로그인했습니다 (데모)`);
      setSession(next);
    } catch (err) {
      console.error("[TripTalk] 데모 로그인 실패:", err);
      showToast("로그인 처리 중 문제가 발생했습니다.");
    } finally {
      setLoadingProvider(null);
      setBusy(false);
    }
  };

  const onSocial = (provider: ProviderKey) => {
    if (isConfigured(provider)) startRealLogin(provider);
    else void startDemoLogin(provider);
  };

  const onLogout = async () => {
    await logout();               // 쿠키는 서버만 지울 수 있습니다
    setSession(null);
    showToast("로그아웃되었습니다");
  };

  const providerMeta = session ? PROVIDERS[session.provider] : null;

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
          </div>
        </aside>

        {/* ── 우: 로그인 폼 ─────────────────────────── */}
        <main className="auth__main">
          {!session ? (
            <section className="auth__card" id="loginCard">
              <Link href="/" className="auth__back">← 홈으로</Link>

              <header className="auth__head">
                <Badge>🧳 베타 기간 무료</Badge>
                <h1>다시 만나서 반가워요</h1>
                <p>신한 SOL 계정으로 시작하세요.<br />따로 만들 아이디도, 비밀번호도 없습니다.</p>
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
                        {`${PROVIDERS[p].label} 계정으로 시작하기`}
                        {demoProviders.includes(p) ? " (데모)" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="auth__switch">
                처음이신가요? 신한 SOL 로 시작하면 <b>그 자리에서 가입까지 끝납니다.</b><br />
                슈퍼SOL 에서 환전하고 오셨다면 <b>로그인 없이도</b> 제한 없이 쓰실 수 있습니다.
              </p>

              <p className="auth__terms">
                계속 진행하면 TripTalk의 <Link href="/terms">이용약관</Link> 및{" "}
                <Link href="/privacy">개인정보처리방침</Link>에 동의하는 것으로 간주됩니다.
              </p>

              {demoProviders.length ? (
                <p className="auth__demo" id="demoNotice">
                  <b>데모 모드</b>
                  신한 SOL 연동 키가 아직 없어 로그인 흐름만 시연합니다. 외부로 전송되는 정보가 없습니다.
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
                  <dd id="doneProvider">{providerMeta ? `${providerMeta.label} 계정` : "—"}</dd>
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
                  onClick={() => void onLogout()}
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
