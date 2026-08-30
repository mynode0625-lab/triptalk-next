import type { ProviderKey } from "@/types/session";

export type ProviderMeta = {
  label: string;
  avatar: string;
  authUrl: string;
  scope: string;
  demo: { name: string; email: string };
};

/**
 * 로그인 제공자.
 *
 * 카카오·네이버·Google 소셜 로그인은 내렸습니다. TripTalk 은 슈퍼SOL 환전 고객에게
 * 딸려 가는 서비스이므로, 계정도 신한 SOL 하나로 잇는 편이 사용자에게 단순합니다.
 * 여러 소셜 계정을 열어 두면 "어느 걸로 가입했더라" 를 사용자가 기억해야 합니다.
 *
 * ⚠ 신한 SOL 은 공개 OAuth 제공자가 아닙니다. 인가·토큰·프로필 주소는 제휴가
 * 확정돼야 받을 수 있어, 여기서는 **환경변수로 비워 둡니다.** 모르는 주소를
 * 그럴듯하게 적어 두면 연동이 된 것처럼 보여 더 위험합니다. 값이 없으면
 * `isConfigured()` 가 false 라 로그인은 데모 흐름으로 동작합니다.
 */
export const PROVIDERS: Record<ProviderKey, ProviderMeta> = {
  shinhan: {
    label: "신한 SOL",
    avatar: "🏦",
    authUrl: process.env.NEXT_PUBLIC_SHINHAN_AUTH_URL ?? "",
    scope: process.env.NEXT_PUBLIC_SHINHAN_SCOPE ?? "",
    demo: { name: "강선영", email: "sunyoung****@shinhan.com" }
  }
};

export const PROVIDER_KEYS = Object.keys(PROVIDERS) as ProviderKey[];

/**
 * 클라이언트 ID.
 * 채워져 있으면 "실제 로그인"으로, 비어 있으면 "데모 모드"로 동작합니다.
 * (`NEXT_PUBLIC_` 접두사가 붙은 값만 브라우저 번들에 들어갑니다.
 *  시크릿은 절대 여기 두지 말고 Route Handler 에서 `process.env` 로 읽으세요.)
 */
export const CLIENT_IDS: Record<ProviderKey, string> = {
  shinhan: process.env.NEXT_PUBLIC_SHINHAN_CLIENT_ID ?? ""
};

/** 인가 코드를 토큰으로 바꿔줄 서버 주소 → POST {API_BASE}/{provider} */
export const API_BASE = "/api/auth";

/** 아이디와 인가 주소가 둘 다 있어야 실제 로그인을 걸 수 있습니다. */
export const isConfigured = (p: ProviderKey): boolean =>
  Boolean(CLIENT_IDS[p] && PROVIDERS[p].authUrl);

export const anyConfigured = (): boolean => PROVIDER_KEYS.some(isConfigured);
