"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Heart, MessageSquare, Share2, LinkIcon } from "lucide-react";
import CurationSkeleton from "@/app/components/skeleton/curation-skeleton";
import { stripHtml } from "@/lib/htmlutils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Curation 데이터 인터페이스 정의
interface Curation {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
  likeCount: number;
  commentCount: number;
  urls: {
    url: string;
    title: string;
    description: string;
    imageUrl: string;
    id?: number;
    click?: number; // Add click count
  }[];
  tags: { name: string }[];
  viewCount?: number;
  authorName: string;
  memberImgUrl: string;
}

// API 응답 인터페이스 정의
interface ApiResponse {
  code: string;
  msg: string;
  data: Curation[];
}

// API URL 상수
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://52.78.27.224";
const PAGE_SIZE = 20;

// 디바운스 함수 구현
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function FollowingCurations() {
  const [curations, setCurations] = useState<Curation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const currentPageRef = useRef<number>(0); // 현재 페이지를 추적하기 위한 ref 추가

  // API 요청 함수를 useCallback으로 감싸기
  const fetchFollowingCurations = useCallback(
    async (pageNum = 0, isLoadMore = false, forceLoad = false) => {
      // 이미 로딩 중이면 중복 요청 방지 (forceLoad가 true면 무시)
      if (
        !forceLoad &&
        ((isLoadMore && loadingMore) || (!isLoadMore && loading))
      ) {
        console.log("이미 로딩 중입니다. 요청 무시됨.");
        return;
      }

      // 페이지 번호가 현재 페이지와 같으면 중복 요청 방지 (무한 스크롤 시)
      if (isLoadMore && pageNum <= currentPageRef.current) {
        console.log(`이미 로드된 페이지(${pageNum})입니다. 요청 무시됨.`);
        return;
      }

      try {
        if (isLoadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const url = `${API_URL}/api/v1/curation/following?page=${pageNum}&size=${PAGE_SIZE}`;
        console.log(`API 요청: ${url}`);

        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log(`API 응답 상태: ${response.status}`);

        if (!response.ok) {
          throw new Error(
            `API 요청 실패: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("API 응답 데이터:", data);

        if (data && data.data) {
          // API 응답에서 큐레이션 배열 직접 추출
          const newCurations = data.data;

          console.log(
            `Received ${newCurations.length} curations for page ${pageNum}`
          );

          // 더 불러올 데이터가 있는지 확인 (받은 데이터가 PAGE_SIZE보다 적으면 더 이상 없음)
          setHasMore(newCurations.length === PAGE_SIZE);

          if (isLoadMore) {
            setCurations((prev) => [...prev, ...newCurations]);
            // 현재 페이지 업데이트
            currentPageRef.current = pageNum;
          } else {
            setCurations(newCurations);
            // 페이지 초기화
            currentPageRef.current = pageNum;
          }
        } else {
          console.error("응답에 데이터가 없습니다:", data);
          if (!isLoadMore) {
            setCurations([]);
          }
          setHasMore(false);
        }
      } catch (error) {
        console.error("팔로잉 큐레이션 가져오기 오류:", error);
        setError((error as Error).message);
      } finally {
        if (isLoadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [loading, loadingMore]
  );

  // 더 불러오기 함수 수정
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;
    console.log(`Loading more: page ${nextPage}`);
    setPage(nextPage);
    fetchFollowingCurations(nextPage, true);
  }, [page, loadingMore, hasMore, fetchFollowingCurations]);

  // 링크 클릭 처리 함수
  const handleLinkClick = async (url: string, linkId?: number) => {
    if (!linkId && !url) return;

    try {
      if (linkId) {
        console.log(`링크 클릭 요청: 링크 ID ${linkId}`);
        // 링크 클릭 시 백엔드에 조회수 증가 요청
        const response = await fetch(`${API_URL}/api/v1/link/click/${linkId}`, {
          method: "GET",
          credentials: "include",
        });

        console.log(`링크 클릭 응답 상태: ${response.status}`);

        if (response.ok) {
          const result = await response.json();
          console.log("링크 클릭 기록됨:", result);
        }
      }
    } catch (error) {
      console.error("링크 클릭 처리 중 오류:", error);
    }

    // 링크 클릭 후 새 탭에서 URL 열기
    window.open(url, "_blank");
  };

  // 좋아요 추가 API 호출 함수
  const likeCuration = async (id: number) => {
    // 로그인 상태 확인
    const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn) {
      // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
      alert("좋아요 기능을 사용하려면 로그인해주세요.");

      // 현재 URL을 저장하고 로그인 페이지로 이동
      sessionStorage.setItem("loginRedirectPath", window.location.pathname);
      window.location.href = "/auth/login";
      return;
    }

    try {
      console.log(`좋아요 요청: 큐레이션 ID ${id}`);
      const response = await fetch(`${API_URL}/api/v1/curation/like/${id}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(`좋아요 응답 상태: ${response.status}`);

      if (!response.ok) {
        throw new Error(
          `좋아요 실패: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("좋아요 응답:", result);

      // 좋아요를 추가한 후, 좋아요 카운트만 업데이트
      setCurations((prev) =>
        prev.map((curation) =>
          curation.id === id
            ? { ...curation, likeCount: curation.likeCount + 1 }
            : curation
        )
      );
    } catch (error) {
      console.error("좋아요 처리 중 오류:", error);
    }
  };

  // 날짜 형식화 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
  };

  // 초기 데이터 로드 수정
  useEffect(() => {
    console.log("컴포넌트 마운트: 초기 데이터 로드 시작");
    setPage(0);
    setHasMore(true);
    currentPageRef.current = 0; // 현재 페이지 초기화

    // forceLoad를 true로 설정하여 로딩 상태와 관계없이 요청 실행
    fetchFollowingCurations(0, false, true);
  }, []);

  // 디바운스된 스크롤 핸들러 생성
  const debouncedHandleScroll = useCallback(
    debounce(() => {
      if (loadingMore || !hasMore) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const buffer = 100; // 하단에서 100px 위에 도달하면 로드

      if (scrollPosition >= documentHeight - buffer) {
        console.log("Reached bottom of page, loading more...");
        loadMore();
      }
    }, 200), // 200ms 디바운스
    [loadMore, loadingMore, hasMore]
  );

  // 스크롤 이벤트 리스너 등록
  useEffect(() => {
    window.addEventListener("scroll", debouncedHandleScroll);
    return () => {
      window.removeEventListener("scroll", debouncedHandleScroll);
    };
  }, [debouncedHandleScroll]);

  return (
    <>
      {/* 로딩 상태 표시 - 스켈레톤 UI로 대체 */}
      {loading ? (
        <div className="space-y-6 pt-4">
          {[...Array(3)].map((_, index) => (
            <CurationSkeleton key={index} />
          ))}
        </div>
      ) : (
        /* 게시글 목록 */
        <div className="space-y-6 pt-4">
          {curations.length === 0 ? (
            <p>팔로우 중인 큐레이터의 글이 없습니다.</p>
          ) : (
            <>
              {curations.map((curation) => (
                <div key={curation.id} className="space-y-4 border-b pb-6">
                  {/* 작성자 정보 추가 */}
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={curation.memberImgUrl}
                        alt={curation.authorName}
                      />
                      <AvatarFallback>
                        {curation.authorName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {curation.authorName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(curation.createdAt)}
                      </p>
                    </div>
                    {curation.viewCount !== undefined && (
                      <p className="text-xs text-gray-500 ml-auto">
                        조회수 {curation.viewCount}
                      </p>
                    )}
                  </div>

                  <div>
                    <Link href={`/curation/${curation.id}`} className="group">
                      <h2 className="text-xl font-bold group-hover:text-blue-600">
                        {curation.title}
                      </h2>
                    </Link>
                    <p className="mt-2 text-gray-600">
                      {curation.content ? stripHtml(curation.content, 100) : ""}
                    </p>
                    <button className="mt-2 text-sm font-medium text-blue-600">
                      더보기
                    </button>
                  </div>

                  {/* 태그 표시 */}
                  <div className="flex flex-wrap space-x-2 mt-2">
                    {curation.tags.map((tag, index) => (
                      <span
                        key={`${tag.name}-${index}`}
                        className="px-3 py-1 text-sm font-medium rounded-full bg-gray-200 text-gray-600 mb-2"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  {/* 메타 데이터 카드 */}
                  {curation.urls.map((urlObj, index) => {
                    const url = urlObj.url;
                    return (
                      <div
                        key={`${urlObj.url}-${index}`}
                        onClick={() => handleLinkClick(url, urlObj.id)}
                        className="mt-4 rounded-lg border p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {urlObj.imageUrl ? (
                            <img
                              src={
                                urlObj.imageUrl ||
                                "/placeholder.svg?height=48&width=48"
                              }
                              alt="Preview"
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <LinkIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-medium">
                              {urlObj.title || "링크"}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {urlObj.description || urlObj.url}
                            </p>
                            {urlObj.click !== undefined && (
                              <p className="text-xs text-gray-500 mt-1">
                                조회수: {urlObj.click}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        className={`flex items-center space-x-1 text-sm ${
                          sessionStorage.getItem("isLoggedIn") === "true"
                            ? "text-gray-500 cursor-pointer"
                            : "text-gray-400 cursor-not-allowed"
                        }`}
                        onClick={() => likeCuration(curation.id)}
                        disabled={
                          sessionStorage.getItem("isLoggedIn") !== "true"
                        }
                      >
                        <Heart className="h-4 w-4" />
                        <span>{curation.likeCount}</span>
                      </button>
                      <button className="flex items-center space-x-1 text-sm text-gray-500">
                        <MessageSquare className="h-4 w-4" />
                        <span>{curation.commentCount || 0}</span>
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <button>
                        <Share2 className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* 더 불러오기 로딩 표시 */}
              <div ref={loadMoreRef} className="py-4 text-center">
                {loadingMore ? (
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    <span className="ml-2">불러오는 중...</span>
                  </div>
                ) : hasMore ? (
                  <p className="text-sm text-gray-500">
                    스크롤하여 더 불러오기
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">더 이상 글이 없습니다</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
