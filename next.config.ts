import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy
 *
 * 노리는 것은 **개인 API 키의 유출 경로를 막는 것**입니다. 연습실 설정에 넣는
 * 클라우드 TTS 키는 이 브라우저의 localStorage 에 평문으로 있어서, 스크립트 주입이
 * 한 번 성공하면 그대로 읽힙니다. 읽히더라도 **바깥으로 나갈 길**이 없으면
 * 피해가 크게 줄어듭니다 — `connect-src` 와 `img-src` 가 그 길을 닫습니다.
 *
 * `script-src` 에 `'unsafe-inline'` 이 있는 이유:
 *   Next 는 스트리밍·하이드레이션 데이터를 인라인 `<script>` 로 넣습니다. 이걸
 *   nonce 로 허용하려면 요청마다 nonce 를 만들어야 하고, 그러면 **모든 페이지가
 *   동적 렌더링으로 바뀝니다.** 지금 랜딩·연습실·로그인은 정적 프리렌더라
 *   Lighthouse 성능이 98~99 인데, 그걸 내주면서 얻는 값이 크지 않다고 봤습니다.
 *   (문서: node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md)
 *   지켜야 할 사용자 데이터가 서버에 생기면 그때 nonce 방식으로 올리는 게 맞습니다.
 */
const csp = [
  "default-src 'self'",
  // 개발 중에는 React 가 eval 로 디버그 정보를 만듭니다. 배포본에는 넣지 않습니다.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  // 서버 TTS 응답을 blob URL 로 만들어 재생합니다.
  "media-src 'self' blob:",
  // 나갈 수 있는 곳을 이 셋으로 못박습니다. 개인 키를 쓰는 두 업체와 우리 서버뿐입니다.
  // (개발 중에는 Turbopack HMR 이 웹소켓을 씁니다.)
  `connect-src 'self' https://api.openai.com https://api.elevenlabs.io${isDev ? " ws: http://localhost:*" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'"
  /*
   * `upgrade-insecure-requests` 는 넣지 않습니다.
   * WebKit 은 이 지시어를 만나면 `http://localhost` 의 하위 리소스까지 https 로
   * 올리려다 TLS 오류로 화면을 깨뜨립니다 (Chromium 은 localhost 를 예외로 둡니다).
   * 위 정책이 이미 자기 출처와 https 호스트 둘로 범위를 못박고 있어 http 리소스가
   * 끼어들 자리가 없으므로, 얻는 것보다 잃는 것이 큽니다.
   */
].join("; ");

/**
 * 보안 응답 헤더 — 모든 경로에 적용합니다.
 *
 * 이 앱은 마이크를 쓰므로 `microphone=(self)` 로 자기 출처만 허용하고,
 * 나머지 강력한 권한(카메라·위치)은 명시적으로 닫습니다.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // 다음 접속부터는 브라우저가 알아서 https 로만 갑니다 (2년).
  // `includeSubDomains` 와 `preload` 는 넣지 않습니다 — 아직 https 가 아닌
  // 하위 도메인이 있으면 그쪽이 통째로 접속 불가가 되고, preload 는 되돌리기 어렵습니다.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000" }]),
  // CSP frame-ancestors 를 모르는 옛 브라우저용 보조
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // 브라우저의 MIME 추측을 끕니다.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 외부 사이트로 나갈 때 경로·쿼리(=OAuth 인가코드)가 새지 않게 합니다.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" }
];

const nextConfig: NextConfig = {
  // 서버 종류를 광고할 이유가 없습니다.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
