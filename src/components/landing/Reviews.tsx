const REVIEWS = [
  { text: "입국심사에서 처음으로 안 얼었어요. Ryan 캐릭터가 하도 꼬치꼬치 물어봐서 실제 심사는 오히려 쉬웠습니다.", name: "김지현", meta: "· 3개월 사용 · 미국 서부" },
  { text: "호텔 방 바꿔달라는 말을 영어로 해본 게 처음이었는데, 연습해둔 문장이 그대로 나왔습니다. 신기했어요.", name: "박준영", meta: "· 6주 사용 · 파리" },
  { text: "사람 앞에서 영어 하는 게 부끄러웠는데 AI라서 100번도 다시 말했습니다. 그게 제일 좋았어요.", name: "이수민", meta: "· 4개월 사용 · 도쿄/오사카" },
  { text: "출국 2주 전에 시작했는데 커리큘럼이 알아서 짜여서 뭘 공부할지 고민을 안 했습니다.", name: "최민아", meta: "· 2주 사용 · 방콕" }
];

export function Reviews() {
  return (
    <section className="section section--tint" id="reviews">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">사용자 후기</span>
          <h2>다녀온 사람들의 이야기</h2>
        </div>
        <div className="reviews">
          {REVIEWS.map(r => (
            <figure className="review reveal" key={r.name}>
              <blockquote>{r.text}</blockquote>
              <figcaption><b>{r.name}</b><span>{r.meta}</span></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
