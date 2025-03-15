"use client";

import { usePathname } from "next/navigation";
import Header from "./header";

export default function HeaderWrapper() {
  const pathname = usePathname();

  // ❌ 헤더를 숨기고 싶은 경로
  const hideHeaderOnPaths = ["/auth/login", "/auth/signup", "/no-header"];

  // 현재 경로가 숨길 목록에 포함되지 않으면 Header 렌더링
  if (hideHeaderOnPaths.includes(pathname)) {
    return null; // 헤더 숨김
  }

  return <Header />;
}
