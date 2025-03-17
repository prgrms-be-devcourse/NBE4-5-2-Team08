"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageSquare, Share2, ArrowLeft } from "lucide-react";
import { ClipLoader } from "react-spinners";
import { stripHtml } from "@/lib/htmlutils";

// Curator 데이터 인터페이스 정의
interface Curator {
  username: string;
  profileImage: string;
  introduce: string;
  curationCount: number;
  followed: boolean; // 팔로우 상태 추가
  login: boolean; // 로그인 상태 추가
}

// Curation 데이터 인터페이스 정의
interface Curation {
  id: number;
  title: string;
  content: string;
  authorName: string;
  memberImgUrl: string;
  createdAt: string;
  modifiedAt: string;
  likeCount: number;
  urls: {
    url: string;
    title: string;
    description: string;
    imageUrl: string;
  }[];
  tags: { name: string }[];
}

// API_URL 변수를 직접 설정하여 환경 변수 문제 해결
const API_URL = "http://52.78.27.224";
const PAGE_SIZE = 20;

export default function CuratorProfile({
  params,
}: {
  params: { username: string };
}) {
  const [curator, setCurator] = useState<Curator | null>(null);
  const [curations, setCurations] = useState<Curation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 큐레이터 정보 가져오기
  const fetchCuratorInfo = async (username: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/members/${username}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("큐레이터 정보를 불러오는 데 실패했습니다.");
      }
      const data = await response.json();
      if (data.code === "200-4") {
        setCurator(data.data);
      } else {
        throw new Error(data.msg || "큐레이터 데이터가 없습니다.");
      }
    } catch (error) {
      console.error("Error fetching curator info:", error);
      setError((error as Error).message);
    }
  };

  // 큐레이터의 큐레이션 목록 가져오기
  const fetchCuratorCurations = async (
    username: string,
    pageNum: number,
    isLoadMore = false
  ) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      console.log(`Fetching curations for page ${pageNum}`);
      const response = await fetch(
        `${API_URL}/api/v1/curation/author/${username}?page=${pageNum}&size=${PAGE_SIZE}`
      );
      if (!response.ok) {
        throw new Error("큐레이션 목록을 불러오는 데 실패했습니다.");
      }

      const data = await response.json();
      if (data && data.data) {
        console.log(`Received ${data.data.length} curations`);
        if (isLoadMore) {
          setCurations((prev) => [...prev, ...data.data]);
        } else {
          setCurations(data.data);
        }

        // 받아온 데이터가 PAGE_SIZE보다 적으면 더 이상 데이터가 없는 것으로 판단
        setHasMore(data.data.length === PAGE_SIZE);
      } else {
        console.error("No curation data found in the response");
        if (!isLoadMore) {
          setCurations([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching curator curations:", error);
      setError((error as Error).message);
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // 더 많은 큐레이션 로드
  const loadMore = () => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;
    console.log(`Loading more curations, page ${nextPage}`);
    setPage(nextPage);
    fetchCuratorCurations(params.username, nextPage, true);
  };

  // Add follow/unfollow functions
  const handleFollow = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/members/${params.username}/follow`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("팔로우 처리 실패");
      }

      setCurator((prev) => (prev ? { ...prev, followed: true } : prev));
    } catch (error) {
      console.error("팔로우 처리 중 오류:", error);
    }
  };

  const handleUnfollow = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/members/${params.username}/unfollow`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("언팔로우 처리 실패");
      }

      setCurator((prev) => (prev ? { ...prev, followed: false } : prev));
    } catch (error) {
      console.error("언팔로우 처리 중 오류:", error);
    }
  };

  // 스크롤 이벤트 처리
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore || !loadMoreRef.current) return;

      // 현재 스크롤 위치
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      // 화면에 보이는 높이
      const windowHeight = window.innerHeight;
      // 문서 전체 높이
      const documentHeight = document.documentElement.scrollHeight;

      // 스크롤이 하단에 도달했는지 확인 (하단에서 100px 위에 도달했을 때 로드)
      if (scrollTop + windowHeight >= documentHeight - 100) {
        console.log("Bottom reached, loading more...");
        loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore, page]);

  // 컴포넌트 마운트 시 API 호출
  useEffect(() => {
    console.log("Component mounted, fetching initial data");
    fetchCuratorInfo(params.username);
    fetchCuratorCurations(params.username, 0);

    // 페이지 초기화
    setPage(0);
    setHasMore(true);
  }, [params.username]);

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 뒤로 가기 버튼 */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-black"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          홈으로 돌아가기
        </Link>
      </div>

      {loading && curations.length === 0 ? (
        <div className="flex justify-center items-center py-10">
          <ClipLoader size={50} color="#3498db" />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-600 rounded-lg border border-red-200">
          <p className="font-medium">오류가 발생했습니다</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : curator ? (
        <>
          {/* 큐레이터 프로필 */}
          <div className="mb-8 p-6 bg-white rounded-lg border shadow-sm">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                <Image
                  src={
                    curator.profileImage ||
                    `/placeholder.svg?height=96&width=96`
                  }
                  alt={curator.username}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold mb-2">{curator.username}</h1>
                <p className="text-gray-600 mb-4">{curator.introduce}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {curator.curationCount}
                    </p>
                    <p className="text-sm text-gray-500">큐레이션</p>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                {curator.login ? (
                  <button
                    onClick={curator.followed ? handleUnfollow : handleFollow}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      curator.followed
                        ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {curator.followed ? "팔로우중" : "팔로우"}
                  </button>
                ) : (
                  <Link href="/auth/login">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      로그인하고 팔로우
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* 큐레이션 목록 제목 */}
          <h2 className="text-xl font-bold mb-6 border-b pb-2">
            {curator.username}님의 큐레이션 ({curator.curationCount})
          </h2>

          {/* 큐레이션 목록 */}
          {curations.length === 0 ? (
            <div className="p-10 bg-gray-50 rounded-lg border text-center">
              <p className="text-gray-500">아직 작성한 큐레이션이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {curations.map((curation) => (
                <div key={curation.id} className="space-y-4 border-b pb-6">
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">{`작성된 날짜 : ${formatDate(
                      curation.createdAt
                    )}`}</p>
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
                    <Link
                      href={`/curation/${curation.id}`}
                      className="mt-2 inline-block text-sm font-medium text-blue-600"
                    >
                      더보기
                    </Link>
                  </div>

                  {/* 태그 표시 */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {curation.tags.map((tag) => (
                      <span
                        key={tag.name}
                        className={`px-3 py-1 text-sm font-medium rounded-full cursor-pointer ${
                          tag.name === "포털"
                            ? "bg-blue-100 text-blue-800"
                            : tag.name === "개발"
                            ? "bg-green-100 text-green-800"
                            : tag.name === "디자인"
                            ? "bg-purple-100 text-purple-800"
                            : tag.name === "AI"
                            ? "bg-red-100 text-red-800"
                            : tag.name === "생산성"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>

                  {/* 메타 데이터 카드 */}
                  {curation.urls?.map((urlObj, index) => (
                    <Link
                      key={index}
                      href={urlObj.url}
                      passHref
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="mt-4 rounded-lg border p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <img
                            src={urlObj.imageUrl || "/placeholder.svg"}
                            alt="Preview"
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                          <div>
                            <h3 className="font-medium">{urlObj.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {urlObj.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Heart className="h-4 w-4" />
                        <span>{curation.likeCount}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <MessageSquare className="h-4 w-4" />
                        <span>0</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button>
                        <Share2 className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* 로딩 더 보기 영역 */}
              <div ref={loadMoreRef} className="py-4 text-center">
                {loadingMore ? (
                  <div className="flex justify-center items-center py-4">
                    <ClipLoader size={30} color="#3498db" />
                  </div>
                ) : hasMore ? (
                  <p className="text-sm text-gray-500">
                    스크롤하여 더 많은 큐레이션 보기
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    더 이상 큐레이션이 없습니다
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
