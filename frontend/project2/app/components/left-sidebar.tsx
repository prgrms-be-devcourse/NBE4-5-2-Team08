// Change to client component
"use client";

import { Hash } from "lucide-react";
import { useEffect, useState } from "react";

export default function LeftSidebar() {
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrendingTags() {
      try {
        setIsLoading(true);
        const response = await fetch(
          "http://52.78.27.224/api/v1/curation/trending-tag",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("트렌딩 태그를 불러오는데 실패했습니다.");
        }

        const data = await response.json();
        if (data.code === "200-1" && data.data && data.data.tags) {
          setTrendingTags(data.data.tags);
        } else {
          throw new Error("트렌딩 태그 데이터 형식이 올바르지 않습니다.");
        }
      } catch (error) {
        console.error("트렌딩 태그 로딩 오류:", error);
        setError((error as Error).message);
        // 에러 발생 시 기본 태그 사용
        setTrendingTags(["AI", "개발", "생산성", "자바스크립트", "디자인"]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrendingTags();
  }, []);

  // 태그 클릭 핸들러
  const handleTagClick = (tag: string) => {
    // 커스텀 이벤트를 통해 post-list 컴포넌트에 태그 선택을 알림
    const event = new CustomEvent("selectTag", {
      detail: { tag },
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">트렌딩 태그</h2>
        {isLoading ? (
          // 로딩 상태 표시
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center rounded-md px-3 py-2 animate-pulse"
              >
                <div className="h-4 w-4 rounded-full bg-gray-200 mr-2"></div>
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          // 에러 상태 표시
          <div className="text-sm text-red-500 p-2">{error}</div>
        ) : (
          // 태그 목록 표시
          <nav className="space-y-1">
            {trendingTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="flex items-center rounded-md px-3 py-2 text-sm hover:bg-gray-100 w-full text-left"
              >
                <Hash className="mr-2 h-4 w-4" />
                <span>#{tag}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
