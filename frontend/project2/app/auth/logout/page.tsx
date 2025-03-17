"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LogoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 클라이언트 사이드에서만 실행되는 코드를 분리
  const isBrowser = typeof window !== "undefined";

  useEffect(() => {
    if (!isBrowser) return; // 서버 사이드에서는 실행하지 않음

    const performLogout = async () => {
      try {
        // 세션 스토리지 초기화 - 먼저 실행하여 UI가 즉시 반응하도록 함
        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("userName");
        sessionStorage.removeItem("userImage");
        sessionStorage.removeItem("userId");

        // 로그아웃 이벤트 발생
        window.dispatchEvent(new Event("logout"));

        const response = await fetch(
          "http://52.78.27.224/api/v1/members/logout",
          {
            method: "POST",
            credentials: "include", // 쿠키를 포함하여 요청
          }
        );

        if (response.ok) {
          toast({
            title: "로그아웃 성공",
            description: "성공적으로 로그아웃되었습니다.",
          });

          setStatus("success");

          // 약간의 지연 후 홈으로 리다이렉트
          setTimeout(() => {
            window.location.href = "/home";
          }, 1000);
        } else {
          const errorData = await response.json();
          setErrorMessage(
            errorData.message || "로그아웃 중 오류가 발생했습니다."
          );
          setStatus("error");
          toast({
            title: "로그아웃 실패",
            description:
              errorData.message || "로그아웃 중 오류가 발생했습니다.",
            variant: "destructive",
          });
        }
      } catch (error) {
        setErrorMessage("서버 연결 중 오류가 발생했습니다.");
        setStatus("error");
        toast({
          title: "오류",
          description: "서버 연결 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    };

    performLogout();
  }, [router, toast, isBrowser]);

  // 버튼 클릭 시 리다이렉트 경로 변경
  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            로그아웃
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === "loading" && "로그아웃 처리 중..."}
          {status === "error" && "로그아웃 중 오류가 발생했습니다."}
          {status === "success" && "성공적으로 로그아웃되었습니다."}
          <div className="mt-4">
            <Button onClick={() => (window.location.href = "/home")}>
              홈으로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
