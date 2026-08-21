"use client";

import { useState } from "react";

/** 시나리오 개수는 서버(page.tsx)에서 세어 내려준다 — lib/data/stats.ts 참고 */
export function Pricing({ sceneCount }: { sceneCount: number }) {
  const [yearly, setYearly] = useState(false);
  const price = (monthly: string, yearlyPrice: string) => (yearly ? yearlyPrice : monthly);

  return (
    <section className="section" id="pricing">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">요금제</span>
          <h2>여행 한 번 값보다 쌉니다</h2>
          <p>모든 요금제는 3일 무료 체험으로 시작합니다.</p>
        </div>

        <div className="toggle reveal">
          <span className={"toggle__label" + (!yearly ? " is-active" : "")} id="labelMonthly">월간</span>
          <button
            className={"switch" + (yearly ? " is-on" : "")}
            id="planSwitch"
            aria-label="요금제 주기 전환"
            aria-pressed={yearly}
            onClick={() => setYearly(v => !v)}
          >
            <span></span>
          </button>
          <span className={"toggle__label" + (yearly ? " is-active" : "")} id="labelYearly">
            연간 <b>2개월 무료</b>
          </span>
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
            <a href="/login" className="btn btn--outline btn--block">무료로 시작</a>
          </article>

          <article className="plan plan--featured reveal">
            <span className="plan__tag">가장 인기</span>
            <h3>Traveler</h3>
            <p className="plan__desc">출국 전 한 달 집중</p>
            <div className="plan__price">
              <b data-monthly="₩12,900" data-yearly="₩10,750">{price("₩12,900", "₩10,750")}</b>
              <small>/월</small>
            </div>
            <ul>
              <li>전체 상황 {sceneCount}개</li>
              <li>AI 캐릭터 8명 전부</li>
              <li>대화 무제한</li>
              <li>발음·문장 교정 리포트</li>
              <li>여행 일정 연동 커리큘럼</li>
            </ul>
            <a href="/login" className="btn btn--primary btn--block">3일 무료 체험</a>
          </article>

          <article className="plan reveal">
            <h3>Family</h3>
            <p className="plan__desc">함께 가는 사람들과</p>
            <div className="plan__price">
              <b data-monthly="₩24,900" data-yearly="₩20,750">{price("₩24,900", "₩20,750")}</b>
              <small>/월</small>
            </div>
            <ul>
              <li>Traveler의 모든 기능</li>
              <li>계정 4개까지</li>
              <li>어린이 전용 캐릭터</li>
              <li>가족 학습 현황판</li>
              <li>동행자 합동 롤플레이</li>
            </ul>
            <a href="/login" className="btn btn--outline btn--block">3일 무료 체험</a>
          </article>
        </div>
      </div>
    </section>
  );
}
