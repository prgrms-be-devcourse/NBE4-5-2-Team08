"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    memberId: "",
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    profileImage: "",
    introduce: "",
    role: "MEMBER",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "비밀번호가 일치하지 않습니다",
        description: "비밀번호를 다시 확인해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://52.78.27.224/api/v1/members/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: formData.memberId,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          profileImage:
            formData.profileImage || "https://example.com/default-profile.jpg",
          email: formData.email,
          introduce: formData.introduce,
        }),
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "회원가입 완료",
          description: "회원가입이 성공적으로 완료되었습니다!",
        });
        router.push("/auth/login");
      } else {
        const errorData = await response.json();
        toast({
          title: "회원가입 실패",
          description:
            errorData.message || "오류가 발생했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description:
          "서버 연결 중 오류가 발생했습니다. 나중에 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mx-auto max-w-md space-y-6 bg-card p-8 rounded-lg shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">회원가입</h1>
          <p className="text-muted-foreground">
            큐레이션 플랫폼에 가입하고 다양한 콘텐츠를 만나보세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="memberId">아이디</Label>
            <Input
              id="memberId"
              name="memberId"
              placeholder="사용할 아이디를 입력하세요"
              required
              value={formData.memberId}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">이름</Label>
            <Input
              id="username"
              name="username"
              placeholder="이름을 입력하세요"
              required
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="이메일을 입력하세요"
              required
              value={formData.email}
              onChange={handleChange}
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profileImage">프로필 이미지 URL (선택사항)</Label>
            <Input
              id="profileImage"
              name="profileImage"
              placeholder="프로필 이미지 URL을 입력하세요"
              value={formData.profileImage}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="introduce">자기소개 (선택사항)</Label>
            <Textarea
              id="introduce"
              name="introduce"
              placeholder="자신을 소개해주세요"
              value={formData.introduce}
              onChange={handleChange}
              className="min-h-[100px] resize-none"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "처리 중..." : "가입하기"}
          </Button>

          <div className="text-center text-sm">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/auth/login"
              className="text-primary underline font-medium"
            >
              로그인
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
