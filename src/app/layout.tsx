import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripTalk — AI 캐릭터와 함께하는 상황별 여행영어",
  description:
    "공항, 호텔, 레스토랑… 진짜 여행에서 쓰는 영어를 AI 캐릭터와 역할극으로 연습하세요. 하루 10분, 상황별 여행영어 학습 서비스 TripTalk.",
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
