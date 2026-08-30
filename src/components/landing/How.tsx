export function How() {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">이용 방법</span>
          <h2>3단계면 충분합니다</h2>
        </div>
        <ol className="steps">
          <li className="step reveal">
            <span className="step__num">01</span>
            <h3>상황 고르기</h3>
            <p>공항 체크인부터 카드 분실 신고까지. 오늘 연습할 상황 하나를 고릅니다.</p>
          </li>
          <li className="step reveal">
            <span className="step__num">02</span>
            <h3>캐릭터와 역할극</h3>
            <p>캐릭터가 영어로 말을 겁니다. 마이크를 누르고 소리 내어 답하면 됩니다.</p>
          </li>
          <li className="step reveal">
            <span className="step__num">03</span>
            <h3>리포트로 복기</h3>
            <p>어긋난 발음과 더 자연스러운 표현을 리포트로 확인하고, 같은 상황을 다시 연습합니다.</p>
          </li>
        </ol>
      </div>
    </section>
  );
}
