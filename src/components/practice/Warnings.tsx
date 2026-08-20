"use client";

/** 환경 점검 배너 — practice.js §7 */
export function Warnings({
  supported,
  secure
}: {
  supported: boolean | null;
  secure: boolean | null;
}) {
  // 판정 전(null)에는 아무것도 렌더하지 않습니다 — hydration 불일치 방지
  if (supported === null || secure === null) return null;

  if (!supported) {
    return (
      <div className="warn warn--info" id="warnUnsupported">
        <b>ℹ️ 이 브라우저는 음성 인식을 지원하지 않습니다.</b>
        <span>
          Chrome 또는 Edge를 권장합니다. 지금은 <b>타이핑 모드</b>로 연습이 가능합니다.
        </span>
      </div>
    );
  }

  if (!secure) {
    return (
      <div className="warn" id="warnInsecure">
        <b>⚠️ 마이크를 쓰려면 보안 연결(HTTPS)로 열어야 합니다.</b>
        <span>
          <code>https://</code> 주소 또는 <code>http://localhost</code> 로 접속해 주세요.
          지금은 <b>타이핑 모드</b>로도 연습할 수 있습니다.
        </span>
      </div>
    );
  }

  return null;
}
