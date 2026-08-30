import { Suspense } from "react";
import { PracticeApp } from "@/components/practice/PracticeApp";

/**
 * 연습실.
 *
 * 랜딩의 카드에서 `/practice?scene=hotel` 처럼 들어오므로 주소의 검색어를 읽습니다.
 * `useSearchParams` 는 프리렌더된 트리를 Suspense 경계까지 클라이언트 렌더로
 * 돌리므로, 경계를 여기에 둡니다.
 */
export default function PracticePage() {
  return (
    <Suspense>
      <PracticeApp />
    </Suspense>
  );
}
