export function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">TripTalk의 방식</span>
          <h2>외우지 말고, 겪어보세요</h2>
          <p>실제 상황을 미리 경험하면 문장은 저절로 남습니다.</p>
        </div>

        <div className="features">
          <article className="feature feature--wide reveal">
            <span className="feature__icon">🎭</span>
            <h3>캐릭터별 말투와 성격</h3>
            <p>느긋한 호텔 직원, 말이 빠른 택시 기사, 무뚝뚝한 입국심사관. 캐릭터마다 억양·속도·표현이 다르기 때문에 어떤 상대를 만나도 당황하지 않습니다.</p>
            <div className="feature__chips">
              <span>영국식/미국식 억양</span><span>속도 3단계</span><span>돌발 질문</span>
            </div>
          </article>
          <article className="feature reveal">
            <span className="feature__icon">🗣</span>
            <h3>말하기 우선</h3>
            <p>타이핑 대신 음성으로 대화합니다. 실제로 소리 내어 말한 시간이 실력이 됩니다.</p>
          </article>
          <article className="feature reveal">
            <span className="feature__icon">🩺</span>
            <h3>즉석 교정</h3>
            <p>문장이 어색하면 대화를 끊지 않고 더 자연스러운 표현을 옆에서 알려줍니다.</p>
          </article>
          <article className="feature reveal">
            <span className="feature__icon">🧭</span>
            <h3>여행 일정 연동</h3>
            <p>출국일과 목적지를 넣으면 필요한 상황부터 순서대로 커리큘럼이 짜입니다.</p>
          </article>
          <article className="feature feature--wide reveal">
            <span className="feature__icon">📼</span>
            <h3>대화 복기 노트</h3>
            <p>연습이 끝나면 내가 말한 문장, 놓친 표현, 다시 들어야 할 구간이 정리됩니다. 공항 가는 길에 카드만 넘겨도 복습이 끝납니다.</p>
            <div className="feature__chips">
              <span>자동 단어장</span><span>망각 곡선 복습</span><span>오프라인 저장</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
