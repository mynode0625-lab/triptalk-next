import type { Metadata } from "next";
import "./login.css";

export const metadata: Metadata = {
  title: "로그인 — TripTalk",
  description: "카카오, 구글, 네이버 계정으로 TripTalk을 시작하세요. 3초면 충분합니다.",
  robots: { index: false },
  icons: { icon: "/icon-bag.svg" }
};

export default function LoginLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
