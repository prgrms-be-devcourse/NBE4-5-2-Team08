"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    memberId: "",
    password: "",
  });

  // 클라이언트 사이드에서만 실행되는 코드를 분리
  const isBrowser = typeof window !== "undefined";

  // 페이지 로드 시 로그인 상태 확인
  useEffect(() => {
    if (!isBrowser) return; // 서버 사이드에서는 실행하지 않음

    const checkLoginStatus = async () => {
      try {
        const response = await fetch("http://52.78.27.224/api/v1/members/me", {
          credentials: "include",
        });

        if (response.ok) {
          // 이미 로그인된 상태면 홈으로 이동
          router.push("/home");
        }
      } catch (error) {
        console.error("로그인 상태 확인 오류:", error);
      }
    };
    checkLoginStatus();
  }, [router, isBrowser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 로그인 요청
      const response = await fetch("http://52.78.27.224/api/v1/members/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: formData.memberId,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "로그인에 실패했습니다.");
      }

      const loginData = await response.json();

      if (loginData) {
        try {
          // 사용자 정보 가져오기
          const userResponse = await fetch(
            "http://52.78.27.224/api/v1/members/me",
            {
              credentials: "include",
            }
          );

          if (!userResponse.ok) {
            throw new Error("사용자 정보를 가져오는데 실패했습니다.");
          }

          const userData = await userResponse.json();

          if (userData && userData.data) {
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem(
              "userName",
              userData.data.username || "사용자"
            );
            sessionStorage.setItem(
              "userImage",
              userData.data.profileImage ||
                "/placeholder.svg?height=32&width=32"
            );
            sessionStorage.setItem("userId", userData.data.id || "");
            sessionStorage.setItem("userRole", userData.data.role || "Member");
          }

          // 로그인 이벤트 발생
          window.dispatchEvent(new Event("login"));

          // 로그인 성공 메시지
          toast({
            title: "로그인 성공",
            description: "환영합니다!",
          });

          // 로그인 후 리다이렉트 경로 확인
          const redirectPath =
            sessionStorage.getItem("loginRedirectPath") || "/home";
          sessionStorage.removeItem("loginRedirectPath"); // 사용 후 삭제

          // 페이지 이동 대신 window.location을 사용하여 전체 ���이지 새로고침과 함께 이동
          setTimeout(() => {
            window.location.href = redirectPath;
          }, 200);
        } catch (error) {
          console.warn("사용자 정보 요청 실패", error);
          setError("로그인 세션을 유지하는데 문제가 발생했습니다.");
        }
      }
    } catch (error: any) {
      console.error("로그인 오류:", error);
      setError(error.message || "아이디 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            로그인
          </CardTitle>
          <CardDescription className="text-center">
            계정에 로그인하고 큐레이션을 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberId">아이디</Label>
              <Input
                id="memberId"
                name="memberId"
                placeholder="아이디를 입력하세요"
                required
                value={formData.memberId}
                onChange={handleChange}
                className={error ? "border-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                required
                value={formData.password}
                onChange={handleChange}
                className={error ? "border-red-500" : ""}
              />
            </div>

            {/* 에러 메시지 표시 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="text-center w-full text-sm">
            아직 계정이 없으신가요?{" "}
            <Link
              href="/auth/signup"
              className="text-primary underline font-medium"
            >
              회원가입
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
