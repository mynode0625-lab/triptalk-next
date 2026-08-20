import type { NextConfig } from "next";

/**
 * 보안 응답 헤더 — 모든 경로에 적용합니다.
 *
 * 이 앱은 마이크를 쓰므로 `microphone=(self)` 로 자기 출처만 허용하고,
 * 나머지 강력한 권한(카메라·위치)은 명시적으로 닫습니다.
 */
const securityHeaders = [
  // 다른 사이트가 iframe 으로 감싸 클릭재킹하는 것을 막습니다.
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
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
