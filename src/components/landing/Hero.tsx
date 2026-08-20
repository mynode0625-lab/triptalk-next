import { Badge } from "@/components/ui/Badge";
import { HeroChat } from "./HeroChat";
import { Stats } from "./Stats";

export function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero__bg" aria-hidden="true">
        <div className="blob blob--1"></div>
        <div className="blob blob--2"></div>
        <div className="grid-lines"></div>
      </div>

      <div className="container hero__inner">
        <div className="hero__copy reveal">
          <Badge>🎧 하루 10분, 말하기 중심 학습</Badge>
          <h1 className="hero__title">
            여행에서 진짜 쓰는 영어,<br />
            <span className="grad">AI 캐릭터</span>와 미리 체험하세요
          </h1>
          <p className="hero__desc">
            공항 체크인부터 호텔 컴플레인까지. 실제 여행에서 마주치는 62가지 상황을
            AI 캐릭터와 역할극으로 연습합니다. 틀려도 괜찮아요, 여기선 아무도 재촉하지 않으니까요.
          </p>

          <div className="hero__cta">
            <a href="/practice" className="btn btn--primary btn--lg">🎙 지금 말하기 연습 시작</a>
            <a href="#characters" className="btn btn--ghost btn--lg">AI 캐릭터 만나기 →</a>
          </div>

          <ul className="hero__points">
            <li>✓ 타이핑 없이 소리 내어 말하기</li>
            <li>✓ 받아쓰기가 틀리면 직접 수정</li>
            <li>✓ 발음 교정 + 표현 교정</li>
          </ul>
        </div>

        <div className="hero__visual reveal reveal--delay">
          <div className="phone">
            <div className="phone__notch"></div>
            <div className="phone__screen">
              <div className="chat-head">
                <div className="chat-head__avatar">👩‍✈️</div>
                <div>
                  <strong>Emma</strong>
                  <small>공항 체크인 카운터 · 응답 중</small>
                </div>
              </div>
              <HeroChat />
              <div className="chat-input">
                <span className="mic">🎙</span>
                <span className="chat-input__hint">눌러서 말하기</span>
              </div>
            </div>
          </div>
          <div className="float-card float-card--1">
            <b>발음 점수</b>
            <div className="score">92<small>/100</small></div>
          </div>
          <div className="float-card float-card--2">
            <b>오늘의 연속 학습</b>
            <div className="score">🔥 14<small>일</small></div>
          </div>
        </div>
      </div>

      <Stats />
    </section>
  );
}
