import Link from "next/link";

/**
 * 마지막 전환 지점.
 *
 * 예전에는 이메일을 받는 폼이었는데, 받은 주소로 아무것도 하지 않았습니다.
 * (제출하면 "데모 페이지라 실제로 발송되지 않습니다" 라고 실토했습니다.)
 * 받아서 쓰지 않을 개인정보는 애초에 받지 않고, 바로 연습으로 보냅니다.
 */
export function Cta() {
  return (
    <section className="cta">
      <div className="container cta__inner reveal">
        <h2>
          다음 여행에선<br />망설이지 않기로 해요
        </h2>
        <p>오늘 10분이면, 공항에서의 3분이 편안해집니다.</p>
        <div className="cta__actions">
          <Link href="/practice" className="btn btn--dark btn--lg">
            🎙 지금 말하기 연습 시작
          </Link>
        </div>
        <small className="cta__note">
          가입도, 결제 수단도 필요 없습니다. 브라우저에서 바로 시작합니다.
        </small>
      </div>
    </section>
  );
}
