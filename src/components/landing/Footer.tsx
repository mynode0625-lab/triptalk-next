import Link from "next/link";
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
          </div>
          <div>
            <h4>지원</h4>
            <a href="#faq">자주 묻는 질문</a>
            <a href="#demo">체험하기</a>
          </div>
          <div>
            <h4>약관</h4>
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy">개인정보처리방침</Link>
          </div>
        </nav>
      </div>
      <div className="container footer__bottom">
        <small>© 2026 TripTalk</small>
      </div>
    </footer>
  );
}
