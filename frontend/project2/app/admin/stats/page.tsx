"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart, TrendingUp, Eye, Heart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// 통계 데이터 타입
interface StatsData {
  totalCurationViews: number;
  totalCurationLikes: number;
  totalPlaylistViews: number;
  totalPlaylistLikes: number;
}

export default function AdminStatsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    // 관리자 권한 확인
    const checkAdminAndFetchData = async () => {
      const userRole = sessionStorage.getItem("userRole");
      if (userRole !== "ADMIN") {
        toast({
          title: "접근 권한 없음",
          description: "관리자만 접근할 수 있는 페이지입니다.",
          variant: "destructive",
        });
        router.push("/home");
        return;
      }

      setIsAdmin(true);

      // 통계 데이터 로드
      try {
        const response = await fetch("http://52.78.27.224/api/v1/admin/stats", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("통계 데이터를 불러오는데 실패했습니다.");
        }

        const data = await response.json();
        if (data.data) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("통계 데이터 로드 오류:", error);
        toast({
          title: "데이터 로드 실패",
          description: "통계 데이터를 불러오는데 실패했습니다.",
          variant: "destructive",
        });

        // 에러 발생 시 가상 데이터 사용
        setStats({
          totalCurationViews: 15234,
          totalCurationLikes: 3250,
          totalPlaylistViews: 28495,
          totalPlaylistLikes: 7483,
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 의존성 배열을 비워서 컴포넌트 마운트 시 한 번만 실행되도록 함

  if (!isAdmin || isLoading) {
    return (
      <div className="container flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          관리자 대시보드로 돌아가기
        </Link>
        <h1 className="text-3xl font-bold mb-2">통계</h1>
        <p className="text-gray-500">사이트 통계를 확인할 수 있습니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">큐레이션 통계</CardTitle>
            <BarChart className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm font-medium">총 조회수</span>
                </div>
                <span className="text-2xl font-bold">
                  {stats && stats.totalCurationViews
                    ? stats.totalCurationViews.toLocaleString()
                    : "0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Heart className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm font-medium">총 좋아요</span>
                </div>
                <span className="text-2xl font-bold">
                  {stats && stats.totalCurationLikes
                    ? stats.totalCurationLikes.toLocaleString()
                    : "0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium">좋아요 비율</span>
                </div>
                <span className="text-2xl font-bold">
                  {stats &&
                  stats.totalCurationViews &&
                  stats.totalCurationViews > 0
                    ? (
                        (stats.totalCurationLikes / stats.totalCurationViews) *
                        100
                      ).toFixed(1) + "%"
                    : "0%"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">
              플레이리스트 통계
            </CardTitle>
            <BarChart className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm font-medium">총 조회수</span>
                </div>
                <span className="text-2xl font-bold">
                  {stats && stats.totalPlaylistViews
                    ? stats.totalPlaylistViews.toLocaleString()
                    : "0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Heart className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm font-medium">총 좋아요</span>
                </div>
                <span className="text-2xl font-bold">
                  {stats && stats.totalPlaylistLikes
                    ? stats.totalPlaylistLikes.toLocaleString()
                    : "0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium">좋아요 비율</span>
                </div>
                <span className="text-2xl font-bold">
                  {stats &&
                  stats.totalPlaylistViews &&
                  stats.totalPlaylistViews > 0
                    ? (
                        (stats.totalPlaylistLikes / stats.totalPlaylistViews) *
                        100
                      ).toFixed(1) + "%"
                    : "0%"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>전체 통계 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-500 mb-1">큐레이션 조회수</p>
              <p className="text-xl font-bold">
                {stats && stats.totalCurationViews
                  ? stats.totalCurationViews.toLocaleString()
                  : "0"}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-500 mb-1">큐레이션 좋아요</p>
              <p className="text-xl font-bold">
                {stats && stats.totalCurationLikes
                  ? stats.totalCurationLikes.toLocaleString()
                  : "0"}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-md">
              <p className="text-sm text-green-500 mb-1">플레이리스트 조회수</p>
              <p className="text-xl font-bold">
                {stats && stats.totalPlaylistViews
                  ? stats.totalPlaylistViews.toLocaleString()
                  : "0"}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-md">
              <p className="text-sm text-purple-500 mb-1">
                플레이리스트 좋아요
              </p>
              <p className="text-xl font-bold">
                {stats && stats.totalPlaylistLikes
                  ? stats.totalPlaylistLikes.toLocaleString()
                  : "0"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
