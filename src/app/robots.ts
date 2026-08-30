import type { MetadataRoute } from "next";

/**
 * 검색 수집을 막습니다.
 *
 * 아직 정식 서비스가 아니라 검색으로 들어오는 사람을 원하지 않습니다. 주소를 아는
 * 사람만 들어옵니다. 페이지의 `robots` 메타 태그와 겹쳐 두는 이유는, 메타 태그는
 * 페이지를 **가져와야** 읽히지만 이 파일은 **가져오기 전에** 읽히기 때문입니다.
 *
 * 서비스를 열 때 이 파일을 지우고 layout.tsx 의 `robots` 줄도 함께 지우면 됩니다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }]
  };
}
