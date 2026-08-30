import type { Metadata } from "next";
import "./login.css";

export const metadata: Metadata = {
  title: "로그인 — TripTalk",
  description: "신한 SOL 계정으로 TripTalk을 시작하세요. 따로 만들 아이디도 비밀번호도 없습니다.",
  robots: { index: false },
  icons: { icon: "/icon-bag.svg" }
};

export default function LoginLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
