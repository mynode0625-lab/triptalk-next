import type { Metadata } from "next";
import "../../login/login.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "후기 관리 — TripTalk",
  // 관리 화면은 검색에 잡힐 이유가 없습니다.
  robots: { index: false, follow: false }
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
