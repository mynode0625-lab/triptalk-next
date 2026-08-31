import type { SceneKey } from "@/types/practice";

/**
 * 돈 트랙 다섯 상황을 마쳤을 때 리포트에 뜨는 안내.
 *
 * 왜 두는가 — 카드가 거절되는 상황을 10분 연습하고 나온 사람은 그 순간
 * "그럼 내 카드는 설정돼 있나" 를 궁금해합니다. 배너와 다른 점이 이것입니다.
 * 배너는 아무 때나 뜨지만 이 안내는 **관심이 이미 생긴 뒤**에 뜹니다.
 *
 * ⚠ **링크를 걸지 않습니다.** 슈퍼SOL 의 딥링크 주소는 공개돼 있지 않아,
 * 추측해 넣으면 열리지 않거나 엉뚱한 화면으로 갑니다. 더 큰 문제는 제휴가
 * 없는 상태에서 은행 링크가 박혀 있으면 **이미 연계된 것처럼 보인다**는 점입니다.
 * 그래서 지금은 문구만 두고, 화면이 스스로 미연동임을 밝히게 했습니다.
 * 연계가 확정되면 여기 `href` 한 줄만 늘리면 됩니다.
 */
export type BankHint = {
  /** 방금 겪은 문제를 한 줄로 되짚습니다. */
  why: string;
  /** 연계되면 열릴 메뉴 이름. 경로 표기로 두어 무엇이 열릴지 보이게 합니다. */
  menu: string;
};

export const BANK_HINTS: Partial<Record<SceneKey, BankHint>> = {
  carddecline: {
    why: "해외에서 카드가 거절되는 가장 흔한 원인은 해외 결제 차단 설정입니다.",
    menu: "슈퍼SOL › 카드 › 해외 결제 설정"
  },
  atm: {
    why: "출금이 실패했다면 인출 한도와 해외 ATM 수수료 조건을 먼저 확인합니다.",
    menu: "슈퍼SOL › 해외 ATM 인출 한도·수수료"
  },
  exchange: {
    why: "남은 외화와 재환전 조건은 앱에서 바로 확인할 수 있습니다.",
    menu: "슈퍼SOL › 환전 내역 · 재환전"
  },
  taxrefund: {
    why: "택스 리펀드는 환급 계좌와 받을 통화를 미리 지정해 두면 창구에서 헤매지 않습니다.",
    menu: "슈퍼SOL › 환급 계좌 · 통화 설정"
  },
  lostcard: {
    why: "카드를 잃어버렸을 때는 영어로 설명하기 전에 분실 신고가 먼저입니다.",
    menu: "슈퍼SOL › 카드 분실 신고"
  }
};

export const bankHintFor = (key: SceneKey | null): BankHint | null =>
  (key && BANK_HINTS[key]) || null;
