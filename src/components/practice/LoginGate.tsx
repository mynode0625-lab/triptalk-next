"use client";

import Link from "next/link";
import { FREE_LIMIT } from "@/lib/practice/freeTrial";

type Props = { onClose: () => void };

/**
 * 무료 횟수를 다 쓴 방문자에게 뜨는 안내.
 * 막는 화면이지만 지금까지 한 연습을 지우지는 않으므로, 닫고 리포트를 다시 볼
 * 수 있게 열어 둡니다.
 */
export function LoginGate({ onClose }: Props) {
  return (
    <div className="modal" id="loginGate" role="dialog" aria-modal="true">
      <div className="modal__box modal__box--sm">
        <button className="modal__x" aria-label="닫기" onClick={onClose}>×</button>
        <span className="eyebrow">무료 체험 종료</span>
        <h2>무료 연습 {FREE_LIMIT}회를 모두 사용했습니다</h2>

        <p className="gate__body">
          로그인하면 <b>제한 없이 이어서</b> 연습할 수 있습니다. 소셜 계정으로 3초면
          끝나고, 새로 만들 비밀번호도 없습니다.
        </p>

        <div className="gate__cta">
          <Link href="/login" className="btn btn--primary">로그인하고 계속하기</Link>
          <button type="button" className="btn btn--outline" onClick={onClose}>나중에</button>
        </div>
      </div>
    </div>
  );
}
