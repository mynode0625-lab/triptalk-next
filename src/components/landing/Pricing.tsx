/**
 * 요금제.
 *
 * 결제 연동이 아직 없다. 가격은 "예정 요금" 으로만 걸어 두고, 버튼은
 * 베타 참여로 보낸다. 누르면 결제가 될 것처럼 보이게 두지 않는다.
 *
 * 연간 결제 토글은 내렸다. 연간을 받는다는 것은 "1년 쓸 만하다" 는 약속인데,
 * 지금은 같은 시나리오가 매번 같은 대본이고 학습 기록도 브라우저에만 남아
 * 그 약속을 지킬 수 없다. 실제 AI 대화와 학습 기록 서버 저장이 붙은 뒤에
 * 다시 올린다 (plan.md 10장).
 *
 * 시나리오 개수는 서버(page.tsx)에서 세어 내려준다 — lib/data/stats.ts 참고
 */
export function Pricing({ sceneCount }: { sceneCount: number }) {
  return (
    <section className="section" id="pricing">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">요금제</span>
          <h2>여행 한 번 값보다 쌉니다</h2>
          <p>베타 기간에는 모든 기능을 무료로 쓸 수 있습니다. 아래는 정식 출시 때 적용할 예정 요금입니다.</p>
        </div>

        <div className="plans">
          <article className="plan reveal">
            <h3>Free</h3>
            <p className="plan__desc">가볍게 맛보기</p>
            <div className="plan__price"><b>₩0</b></div>
            <ul>
              <li>기본 상황 5개</li>
              <li>AI 캐릭터 2명</li>
              <li>하루 대화 3회</li>
              <li className="off">발음 교정 리포트</li>
              <li className="off">여행 일정 연동</li>
            </ul>
            <a href="/login" className="btn btn--outline btn--block">베타 참여하기</a>
          </article>

          <article className="plan plan--featured reveal">
            <span className="plan__tag">가장 인기</span>
            <h3>Traveler</h3>
            <p className="plan__desc">출국 전 한 달 집중</p>
            <div className="plan__price">
              <b>₩12,900</b>
              <small>/월</small>
            </div>
            <p className="plan__beta">베타 기간 무료</p>
            <ul>
              <li>전체 상황 {sceneCount}개</li>
              <li>AI 캐릭터 8명 전부</li>
              <li>대화 무제한</li>
              <li>발음·문장 교정 리포트</li>
              <li>여행 일정 연동 커리큘럼</li>
            </ul>
            <a href="/login" className="btn btn--primary btn--block">베타 참여하기</a>
          </article>

          <article className="plan reveal">
            <h3>Family</h3>
            <p className="plan__desc">함께 가는 사람들과</p>
            <div className="plan__price">
              <b>₩24,900</b>
              <small>/월</small>
            </div>
            <p className="plan__beta">베타 기간 무료</p>
            <ul>
              <li>Traveler의 모든 기능</li>
              <li>계정 4개까지</li>
              <li>어린이 전용 캐릭터</li>
              <li>가족 학습 현황판</li>
              <li>동행자 합동 롤플레이</li>
            </ul>
            <a href="/login" className="btn btn--outline btn--block">베타 참여하기</a>
          </article>
        </div>
      </div>
    </section>
  );
}
