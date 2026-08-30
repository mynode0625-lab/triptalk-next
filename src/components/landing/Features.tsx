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
              <span>영국식·미국식 억양</span><span>말하기 속도 조절</span><span>천천히 다시 듣기</span>
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
            <span className="feature__icon">🎯</span>
            <h3>따라 말하기</h3>
            <p>모범 문장을 그대로 소리 내어 따라 하면, 단어 단위로 어디가 어긋났는지 짚어줍니다.</p>
          </article>
          <article className="feature feature--wide reveal">
            <span className="feature__icon">📋</span>
            <h3>끝나면 바로 복기</h3>
            <p>연습하는 동안 인식이 어긋난 단어와 더 자연스러운 표현이 옆에 쌓이고, 상황을 마치면 결과 리포트로 한 번에 정리됩니다. 카드마다 🔊를 눌러 발음을 다시 들을 수 있습니다.</p>
            <div className="feature__chips">
              <span>발음 연습 단어</span><span>표현 교정 카드</span><span>결과 리포트</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
