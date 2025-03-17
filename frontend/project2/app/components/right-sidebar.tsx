"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 트렌딩 큐레이션 타입 정의
interface TrendingCuration {
  curationId: number;
  title: string;
  authorName: string;
  viewCount: number;
}

export default function RightSidebar() {
  const [trendingCurations, setTrendingCurations] = useState<
    TrendingCuration[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrendingCurations() {
      try {
        setIsLoading(true);
        const response = await fetch(
          "http://52.78.27.224/api/v1/curation/trending-curation",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("인기 큐레이션을 불러오는데 실패했습니다.");
        }

        const data = await response.json();
        if (data.code === "200-1" && data.data && data.data.curations) {
          setTrendingCurations(data.data.curations);
        } else {
          throw new Error("인기 큐레이션 데이터 형식이 올바르지 않습니다.");
        }
      } catch (error) {
        console.error("인기 큐레이션 로딩 오류:", error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrendingCurations();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">오늘의 인기 큐레이션</h2>
        {isLoading ? (
          // 로딩 상태 표시
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1 animate-pulse">
                <div className="flex items-center">
                  <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200"></div>
                  <div className="h-5 w-40 bg-gray-200 rounded"></div>
                </div>
                <div className="pl-8 h-3 w-32 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          // 에러 상태 표시
          <div className="text-sm text-red-500 p-2">{error}</div>
        ) : (
          // 인기 큐레이션 목록 표시
          <div className="space-y-4">
            {trendingCurations.map((curation, index) => (
              <div key={curation.curationId} className="space-y-1">
                <div className="flex items-center">
                  <span
                    className={`mr-2 flex h-6 w-6 items-center justify-center rounded-full ${
                      index === 0 ? "bg-black text-white" : "bg-gray-200"
                    } text-xs font-bold`}
                  >
                    {index + 1}
                  </span>
                  <Link
                    href={`/curation/${curation.curationId}`}
                    className="font-medium hover:text-blue-600"
                  >
                    {curation.title}
                  </Link>
                </div>
                <p className="pl-8 text-xs text-gray-500">
                  {curation.authorName}님 • Today {curation.viewCount}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
