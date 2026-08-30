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
          <b>신한 SOL</b> 계정으로 로그인하면 제한 없이 이어서 연습할 수 있습니다.
          따로 만들 아이디도 비밀번호도 없습니다.
          <span className="gate__note">
            💱 슈퍼SOL 에서 환전하고 오신 분은 로그인 없이도 제한이 없습니다.
          </span>
        </p>

        <div className="gate__cta">
          <Link href="/login" className="btn btn--primary">로그인하고 계속하기</Link>
          <button type="button" className="btn btn--outline" onClick={onClose}>나중에</button>
        </div>
      </div>
    </div>
  );
}
