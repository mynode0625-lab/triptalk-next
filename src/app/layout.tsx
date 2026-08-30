import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripTalk — AI 캐릭터와 함께하는 상황별 여행영어",
  description:
    "공항, 호텔, 레스토랑… 진짜 여행에서 쓰는 영어를 AI 캐릭터와 역할극으로 연습하세요. 하루 10분, 상황별 여행영어 학습 서비스 TripTalk.",
  /* 아직 정식 서비스가 아니라 검색으로 들어오는 것을 원하지 않습니다.
     주소를 아는 사람만 들어옵니다. 서비스를 열 때 이 줄을 지우면 됩니다. */
  robots: { index: false, follow: false },
  icons: { icon: "/icon-bag.svg" },
  appleWebApp: { capable: true },
  other: { "mobile-web-app-capable": "yes" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
