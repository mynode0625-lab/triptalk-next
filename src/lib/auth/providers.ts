import type { ProviderKey } from "@/types/session";

export type ProviderMeta = {
  label: string;
  avatar: string;
  authUrl: string;
  scope: string;
  demo: { name: string; email: string };
};

/** 서비스별 메타 — login.js 이식 */
export const PROVIDERS: Record<ProviderKey, ProviderMeta> = {
  kakao: {
    label: "카카오",
    avatar: "💛",
    authUrl: "https://kauth.kakao.com/oauth/authorize",
    scope: "profile_nickname account_email",
    demo: { name: "강선영", email: "sunyoung****@kakao.com" }
  },
  naver: {
    label: "네이버",
    avatar: "💚",
    authUrl: "https://nid.naver.com/oauth2.0/authorize",
    scope: "",
    demo: { name: "강선영", email: "sunyoung****@naver.com" }
  },
  google: {
    label: "Google",
    avatar: "🔵",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid email profile",
    demo: { name: "Sunyoung Kang", email: "mynode****@gmail.com" }
  }
};

export const PROVIDER_KEYS = Object.keys(PROVIDERS) as ProviderKey[];

/**
 * 클라이언트 ID.
 * 채워져 있으면 해당 서비스는 "실제 로그인"으로, 비어 있으면 "데모 모드"로 동작합니다.
 * (`NEXT_PUBLIC_` 접두사가 붙은 값만 브라우저 번들에 들어갑니다.
 *  시크릿은 절대 여기 두지 말고 Route Handler 에서 `process.env` 로 읽으세요.)
 */
export const CLIENT_IDS: Record<ProviderKey, string> = {
  kakao: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID ?? "",
  naver: process.env.NEXT_PUBLIC_NAVER_CLIENT_ID ?? "",
  google: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""
};

/** 인가 코드를 토큰으로 바꿔줄 서버 주소 → POST {API_BASE}/{provider} */
export const API_BASE = "/api/auth";

export const isConfigured = (p: ProviderKey): boolean => Boolean(CLIENT_IDS[p]);

export const anyConfigured = (): boolean => PROVIDER_KEYS.some(isConfigured);
