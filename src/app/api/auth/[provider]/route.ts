/**
 * OAuth 인가 코드 → 액세스 토큰 → 프로필 조회 (신규)
 *
 * 정적 사이트에서는 클라이언트 시크릿을 둘 곳이 없어 실제 소셜 로그인을
 * 완성할 수 없었습니다. 이 Route Handler 가 그 자리를 채웁니다.
 *
 * 필요한 환경변수 (.env.local / Vercel 프로젝트 설정):
 *   NEXT_PUBLIC_KAKAO_CLIENT_ID   KAKAO_CLIENT_SECRET   (선택 — 카카오는 시크릿이 없을 수 있음)
 *   NEXT_PUBLIC_NAVER_CLIENT_ID   NAVER_CLIENT_SECRET
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID  GOOGLE_CLIENT_SECRET
 */
import type { NextRequest } from "next/server";
import type { NormalizedProfile, ProviderKey } from "@/types/session";

type Body = { code?: string; state?: string; redirectUri?: string };

const CONFIG: Record<ProviderKey, {
  tokenUrl: string;
  profileUrl: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  /** 시크릿이 없어도 토큰 교환이 가능한지 (카카오는 선택) */
  secretOptional: boolean;
}> = {
  kakao: {
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    profileUrl: "https://kapi.kakao.com/v2/user/me",
    clientId: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
    secretOptional: true
  },
  naver: {
    tokenUrl: "https://nid.naver.com/oauth2.0/token",
    profileUrl: "https://openapi.naver.com/v1/nid/me",
    clientId: process.env.NEXT_PUBLIC_NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    secretOptional: false
  },
  google: {
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    secretOptional: false
  }
};

const isProvider = (v: string): v is ProviderKey =>
  v === "kakao" || v === "naver" || v === "google";

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** 제공자별 프로필 응답을 공통 형태로 정규화합니다. */
function normalize(provider: ProviderKey, raw: Record<string, unknown>): NormalizedProfile {
  if (provider === "kakao") {
    const account = (raw.kakao_account ?? {}) as Record<string, unknown>;
    const profile = (account.profile ?? {}) as Record<string, unknown>;
    return {
      provider,
      id: String(raw.id ?? ""),
      name: String(profile.nickname ?? "카카오 사용자"),
      email: String(account.email ?? "")
    };
  }
  if (provider === "naver") {
    const r = (raw.response ?? {}) as Record<string, unknown>;
    return {
      provider,
      id: String(r.id ?? ""),
      name: String(r.name ?? r.nickname ?? "네이버 사용자"),
      email: String(r.email ?? "")
    };
  }
  return {
    provider,
    id: String(raw.sub ?? ""),
    name: String(raw.name ?? "Google 사용자"),
    email: String(raw.email ?? "")
  };
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;

  if (!isProvider(provider)) return fail("지원하지 않는 제공자입니다.", 404);

  const cfg = CONFIG[provider];
  if (!cfg.clientId || (!cfg.clientSecret && !cfg.secretOptional)) {
    // 키가 없으면 클라이언트가 데모 모드로 되돌아갈 수 있도록 명시적으로 알립니다.
    return fail("이 제공자의 서버 키가 설정되지 않았습니다.", 501);
  }

  let body: Body;
  try { body = (await request.json()) as Body; }
  catch { return fail("잘못된 요청 본문입니다.", 400); }

  const { code, state, redirectUri } = body;
  if (!code || !redirectUri) return fail("code 와 redirectUri 가 필요합니다.", 400);

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
    console.error("[TripTalk] 토큰 교환 실패", provider, tokenRes.status, tokenJson);
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
  return Response.json(normalize(provider, raw));
}
