import { Characters } from "@/components/landing/Characters";
import { Cta } from "@/components/landing/Cta";
import { Demo } from "@/components/landing/Demo";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { How } from "@/components/landing/How";
import { Pain } from "@/components/landing/Pain";
import { RevealObserver } from "@/components/landing/RevealObserver";
import { Situations } from "@/components/landing/Situations";
import { ToTop } from "@/components/landing/ToTop";

export default function LandingPage() {
  return (
    <>
      <Header />

      <main>
        <Hero />
        <Pain />
        <Features />

        <section className="section section--tint" id="characters">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">AI 캐릭터</span>
              <h2>여행지에서 만나게 될 사람들</h2>
              <p>카드를 눌러 캐릭터의 첫 마디를 들어보세요.</p>
            </div>
            <Characters />
          </div>
        </section>

        <section className="section" id="situations">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">상황별 커리큘럼</span>
              <h2>여행 순서 그대로 배웁니다</h2>
              <p>출국부터 귀국까지, 실제로 마주치는 순서대로 구성했습니다.</p>
            </div>
            <Situations />
          </div>
        </section>

        <Demo />
        <How />

        <section className="section section--tint" id="faq">
          <div className="container container--narrow">
            <div className="section-head reveal">
              <span className="eyebrow">자주 묻는 질문</span>
              <h2>궁금한 점이 있으신가요</h2>
            </div>
            <Faq />
          </div>
        </section>

        <Cta />
      </main>

      <Footer />
      <ToTop />
      <RevealObserver />
    </>
  );
}
