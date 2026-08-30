import type { Metadata } from "next";
import "../legal.css";

export const metadata: Metadata = {
  title: "개인정보처리방침 — TripTalk",
  description:
    "TripTalk이 어떤 정보를 처리하고, 무엇을 저장하지 않는지 정리했습니다. 연습한 음성과 대화 내용은 서버에 저장되지 않습니다.",
  icons: { icon: "/icon-bag.svg" }
};

export default function PrivacyLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
