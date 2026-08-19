import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo href="#hero" variant="light" />
          <p>AI 캐릭터와 상황별 여행영어를 연습하는 가장 빠른 방법.</p>
        </div>
        <nav className="footer__cols">
          <div>
            <h4>서비스</h4>
            <a href="#features">특징</a>
            <a href="#characters">AI 캐릭터</a>
            <a href="#situations">상황별 학습</a>
            <a href="#pricing">요금제</a>
          </div>
          <div>
            <h4>지원</h4>
            <a href="#faq">자주 묻는 질문</a>
            <a href="#demo">체험하기</a>
            <a href="#">고객센터</a>
            <a href="#">학습 가이드</a>
          </div>
          <div>
            <h4>회사</h4>
            <a href="#">소개</a>
            <a href="#">채용</a>
            <a href="#">이용약관</a>
            <a href="#">개인정보처리방침</a>
          </div>
        </nav>
      </div>
      <div className="container footer__bottom">
        <small>© 2026 TripTalk. 이 사이트는 데모용으로 제작된 가상의 서비스 소개 페이지입니다.</small>
        <div className="footer__social">
          <a href="#" aria-label="인스타그램">◎</a>
          <a href="#" aria-label="유튜브">▶</a>
          <a href="#" aria-label="블로그">✎</a>
        </div>
      </div>
    </footer>
  );
}
