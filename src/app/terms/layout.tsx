import type { Metadata } from "next";
import "../legal.css";

export const metadata: Metadata = {
  title: "이용약관 — TripTalk",
  description:
    "TripTalk 서비스 이용에 관한 조건을 정리했습니다. 현재 모든 기능은 무료로 제공되며 결제 기능이 없습니다.",
  icons: { icon: "/icon-bag.svg" }
};

export default function TermsLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
