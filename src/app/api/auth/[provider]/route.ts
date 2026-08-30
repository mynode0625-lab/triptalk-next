/**
 * OAuth 인가 코드 → 액세스 토큰 → 프로필 조회
 *
 * 정적 사이트에서는 클라이언트 시크릿을 둘 곳이 없어 실제 로그인을 완성할 수
 * 없었습니다. 이 Route Handler 가 그 자리를 채웁니다.
 *
 * 로그인 제공자는 신한 SOL 하나입니다 (lib/auth/providers.ts 참고).
 * 신한 SOL 은 공개 OAuth 제공자가 아니라 주소까지 환경변수로 받습니다 —
 * 제휴 문서를 받기 전에는 값이 없고, 그러면 화면은 데모 흐름으로 동작합니다.
 *
 * 필요한 환경변수 (.env.local / Vercel 프로젝트 설정):
 *   NEXT_PUBLIC_SHINHAN_CLIENT_ID   SHINHAN_CLIENT_SECRET
 *   NEXT_PUBLIC_SHINHAN_AUTH_URL    (인가 화면 — 브라우저가 이동할 주소)
 *   SHINHAN_TOKEN_URL               SHINHAN_PROFILE_URL
 *   AUTH_SECRET                     (세션 쿠키 서명 — 배포본에서는 필수)
 *
 * 성공하면 서명된 HttpOnly 세션 쿠키를 발급합니다. 프로필은 화면 표시용으로만
 * 돌려주고, 로그인 여부의 근거는 언제나 쿠키입니다.
 */
import type { NextRequest } from "next/server";
import { hasStableSecret, issueSession } from "@/lib/auth/cookie";
import { PROVIDERS } from "@/lib/auth/providers";
import type { NormalizedProfile, ProviderKey } from "@/types/session";

type Body = { code?: string; state?: string; redirectUri?: string };

const CONFIG: Record<ProviderKey, {
  tokenUrl: string | undefined;
  profileUrl: string | undefined;
  clientId: string | undefined;
  clientSecret: string | undefined;
}> = {
  shinhan: {
    tokenUrl: process.env.SHINHAN_TOKEN_URL,
    profileUrl: process.env.SHINHAN_PROFILE_URL,
    clientId: process.env.NEXT_PUBLIC_SHINHAN_CLIENT_ID,
    clientSecret: process.env.SHINHAN_CLIENT_SECRET
  }
};

const isProvider = (v: string): v is ProviderKey => v === "shinhan";

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * 프로필 응답을 공통 형태로 정규화합니다.
 *
 * 신한 SOL 의 프로필 응답 형태는 제휴 문서를 받아야 확정됩니다. 지금은 흔히 쓰는
 * 필드 이름을 순서대로 찾아보고, 없으면 빈 값으로 둡니다. 실제 연동 때 고칠 곳은
 * 이 함수 하나입니다.
 */
function normalize(provider: ProviderKey, raw: Record<string, unknown>): NormalizedProfile {
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === "string" && v) return v;
    }
    return "";
  };
  return {
    provider,
    id: pick("id", "userId", "userKey", "sub"),
    name: pick("name", "userName", "nickname") || "신한 SOL 사용자",
    email: pick("email", "userEmail")
  };
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;

  if (!isProvider(provider)) return fail("지원하지 않는 제공자입니다.", 404);

  const cfg = CONFIG[provider];
  if (!cfg.clientId || !cfg.clientSecret || !cfg.tokenUrl || !cfg.profileUrl) {
    // 키나 주소가 없으면 클라이언트가 데모 모드로 되돌아갈 수 있도록 명시적으로 알립니다.
    return fail("이 제공자의 서버 설정이 완료되지 않았습니다.", 501);
  }

  // 실제 로그인을 켜 두고 AUTH_SECRET 을 빠뜨리면, 인스턴스가 바뀔 때마다 세션이
  // 풀려 로그인이 된 듯 안 된 듯 굴러갑니다. 조용히 넘기지 않고 여기서 막습니다.
  if (!hasStableSecret()) {
    console.error("[TripTalk] AUTH_SECRET 이 없습니다. 세션 쿠키를 안정적으로 발급할 수 없습니다.");
    return fail("서버 세션 설정이 완료되지 않았습니다.", 500);
  }

  let body: Body;
  try { body = (await request.json()) as Body; }
  catch { return fail("잘못된 요청 본문입니다.", 400); }

  const { code, state, redirectUri } = body;
  if (!code || !redirectUri) return fail("code 와 redirectUri 가 필요합니다.", 400);

  // redirectUri 는 클라이언트가 보낸 값이라 그대로 믿지 않습니다. 이 사이트의
  // 출처와 같을 때만 토큰 교환에 씁니다. (제공자 콘솔의 화이트리스트와 이중 방어)
  const selfOrigin = request.headers.get("origin") ?? request.nextUrl.origin;
  let redirectOrigin: string;
  try { redirectOrigin = new URL(redirectUri).origin; }
  catch { return fail("redirectUri 형식이 올바르지 않습니다.", 400); }
  if (redirectOrigin !== selfOrigin) {
    return fail("허용되지 않은 redirectUri 입니다.", 400);
  }

  /* ── 1. 인가 코드 → 액세스 토큰 ─────────────────── */
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    code
  });
  if (cfg.clientSecret) form.set("client_secret", cfg.clientSecret);
  if (state) form.set("state", state);

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: form,
    cache: "no-store"
  });

  const tokenJson = (await tokenRes.json().catch(() => ({}))) as Record<string, unknown>;
  const accessToken = tokenJson.access_token;

  if (!tokenRes.ok || typeof accessToken !== "string") {
    // 응답 본문에는 토큰이 들어 있을 수 있어 통째로 로그에 남기지 않습니다.
    // (Vercel 로그는 대시보드에서 그대로 읽힙니다.)
    console.error(
      "[TripTalk] 토큰 교환 실패", provider, tokenRes.status,
      typeof tokenJson.error === "string" ? tokenJson.error : "unknown_error"
    );
    return fail("토큰 교환에 실패했습니다.", 502);
  }

  /* ── 2. 액세스 토큰 → 프로필 ────────────────────── */
  const profileRes = await fetch(cfg.profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });

  if (!profileRes.ok) {
    console.error("[TripTalk] 프로필 조회 실패", provider, profileRes.status);
    return fail("프로필을 가져오지 못했습니다.", 502);
  }

  const raw = (await profileRes.json()) as Record<string, unknown>;
  const profile = normalize(provider, raw);

  /* ── 3. 세션 쿠키 발급 ──────────────────────────── */
  const session = {
    provider,
    name: profile.name,
    email: profile.email,
    avatar: PROVIDERS[provider].avatar,
    loginAt: new Date().toISOString(),
    demo: false
  };
  await issueSession(session);

  return Response.json(
    { session },
    { headers: { "Cache-Control": "no-store" } }
  );
}
