"use client";

import Link from "next/link";
import { FREE_LIMIT, PARTNER_DAILY_LIMIT, type LockReason } from "@/lib/practice/freeTrial";

type Props = { reason: LockReason; onClose: () => void };

/**
 * 더 시작할 수 없을 때 뜨는 안내.
 *
 * 막는 화면이지만 지금까지 한 연습을 지우지는 않으므로, 닫고 리포트를 다시 볼 수
 * 있게 열어 둡니다.
 *
 * 이유에 따라 할 말이 다릅니다. 환전 고객에게 "로그인하세요" 라고 하면 거짓말이
 * 됩니다 — 로그인해도 오늘 몫은 늘지 않고, 내일이면 저절로 채워집니다.
 */
export function LoginGate({ reason, onClose }: Props) {
  const daily = reason === "daily-exhausted";

  return (
    <div className="modal" id="loginGate" role="dialog" aria-modal="true">
      <div className="modal__box modal__box--sm">
        <button className="modal__x" aria-label="닫기" onClick={onClose}>×</button>
        <span className="eyebrow">{daily ? "오늘의 연습 완료" : "무료 체험 종료"}</span>

        {daily ? (
          <>
            <h2>오늘 몫인 {PARTNER_DAILY_LIMIT}회를 모두 사용했습니다</h2>
            <p className="gate__body">
              내일 다시 <b>{PARTNER_DAILY_LIMIT}회</b>가 채워집니다. 하루에 다섯 번이면
              시나리오 다섯 개를 끝까지 하는 분량이라, 매일 조금씩 하는 편이 더 남습니다.
              <span className="gate__note">
                💱 슈퍼SOL 환전 고객이라 여행 날짜까지 매일 이용하실 수 있습니다.
              </span>
            </p>
            <div className="gate__cta">
              <button type="button" className="btn btn--primary" onClick={onClose}>
                리포트 다시 보기
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>무료 연습 {FREE_LIMIT}회를 모두 사용했습니다</h2>
            <p className="gate__body">
              <b>신한 SOL</b> 계정으로 로그인하면 제한 없이 이어서 연습할 수 있습니다.
              따로 만들 아이디도 비밀번호도 없습니다.
              <span className="gate__note">
                💱 슈퍼SOL 에서 환전하고 오신 분은 여행 날짜까지 하루 {PARTNER_DAILY_LIMIT}회
                이용하실 수 있습니다.
              </span>
            </p>
            <div className="gate__cta">
              <Link href="/login" className="btn btn--primary">로그인하고 계속하기</Link>
              <button type="button" className="btn btn--outline" onClick={onClose}>나중에</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
