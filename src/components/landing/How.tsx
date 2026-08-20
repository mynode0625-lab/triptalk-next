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
            <h3>여행 정보 입력</h3>
            <p>목적지와 출국일, 지금의 영어 수준을 알려주세요. 30초면 됩니다.</p>
          </li>
          <li className="step reveal">
            <span className="step__num">02</span>
            <h3>캐릭터와 역할극</h3>
            <p>매일 10분, 오늘의 상황을 AI 캐릭터와 대화로 통과합니다.</p>
          </li>
          <li className="step reveal">
            <span className="step__num">03</span>
            <h3>복기하고 출발</h3>
            <p>틀린 문장은 카드로 저장되고, 출국 전 최종 리허설로 마무리합니다.</p>
          </li>
        </ol>
      </div>
    </section>
  );
}
