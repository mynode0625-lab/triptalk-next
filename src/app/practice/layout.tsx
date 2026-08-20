import type { Metadata } from "next";
import "./practice.css";

export const metadata: Metadata = {
  title: "말하기 연습 — TripTalk",
  description:
    "AI 캐릭터와 실제로 소리 내어 말하며 연습하세요. 음성 인식 받아쓰기, 직접 수정, 발음 교정, 표현 교정까지.",
  icons: { icon: "/icon-mic.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default" }
};

export default function PracticeLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
