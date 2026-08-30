/**
 * 로그인 버튼 아이콘.
 *
 * ⚠ 아래는 신한의 공식 로고가 아닙니다. 공식 로고는 제휴 시 신한에서 받은
 * 원본 자산으로 교체해야 합니다. 임의로 흉내 낸 마크를 쓰면 상표 문제가 됩니다.
 */

export function ShinhanIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 15.2c1.1.8 2.4 1.2 4 1.2 2.2 0 3.4-.9 3.4-2.1 0-1.3-1.2-1.8-3.6-2.3-2.4-.5-3.6-1.2-3.6-2.7C8.2 7.8 9.7 7 11.8 7c1.4 0 2.6.3 3.6.9"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export const PROVIDER_ICONS = {
  shinhan: ShinhanIcon
} as const;
