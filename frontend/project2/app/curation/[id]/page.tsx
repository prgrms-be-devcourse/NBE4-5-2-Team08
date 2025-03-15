"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation"; // `useParams`를 사용하여 params를 받아옵니다.
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  ArrowLeft,
  Edit,
  Trash2,
  MoreVertical,
  MousePointer,
  Flag,
  LinkIcon,
} from "lucide-react";
import RightSidebar from "@/app/components/right-sidebar";
import CommentSection from "@/app/components/comment-section";
import ReportModal from "@/app/components/report-modal";

// API URL을 하드코딩된 값에서 환경 변수로 변경합니다.
// 파일 상단에 다음 상수를 추가합니다:
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// 큐레이션 데이터 타입
interface CurationData {
  id: number;
  title: string;
  content: string;
  authorName: string;
  authorImage: string;
  authorImgUrl: string; // API 응답에 맞게 추가
  authorId: number; // API 응답에 맞게 추가
  createdAt: string;
  modifiedAt: string;
  urls: { url: string; linkId?: number }[];
  tags: { name: string }[];
  likeCount: number;
  viewCount: number;
  comments: { authorName: string; content: string }[];
  liked: boolean; // isLiked에서 liked로 변경
  login: boolean; // 로그인 상태 추가
  followed: boolean; // 팔로우 상태 추가
}

// 링크 메타데이터 타입
interface LinkMetaData {
  title: string;
  description: string;
  image: string;
  url: string;
  click?: number;
  linkId?: number;
}

export default function PostDetail() {
  const { id } = useParams(); // useParams로 id 값을 받습니다.
  const [post, setPost] = useState<CurationData | null>(null);
  const [linksMetaData, setLinksMetaData] = useState<Map<string, LinkMetaData>>(
    new Map()
  );
  // 로딩 상태 분리 - 글 내용과 메타데이터 로딩을 별도로 관리
  const [contentLoading, setContentLoading] = useState(true); // 글 내용 로딩 상태
  const [metaDataLoading, setMetaDataLoading] = useState(false); // 메타데이터 로딩 상태
  const [error, setError] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  // API 데이터 호출 함수 수정
  async function fetchData() {
    try {
      setContentLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/v1/curation/${id}`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Forwarded-For": "127.0.0.1",
          "X-Real-IP": "127.0.0.1",
        },
      });

      if (!response.ok) {
        throw new Error("큐레이션 데이터를 가져오는 데 실패했습니다.");
      }

      const data = await response.json();
      setPost(data.data);
    } catch (err) {
      setError((err as Error).message);
      console.error("Error fetching curation data:", err);
    } finally {
      setContentLoading(false); // 글 내용 로딩 완료
    }
  }

  // 최초 데이터 불러오기
  useEffect(() => {
    fetchData();
  }, [id]);

  // 모든 링크의 메타데이터 가져오기 - 글 내용과 분리
  useEffect(() => {
    if (!post?.urls?.length) return;

    // 각 URL에 대한 메타데이터 가져오기
    async function fetchAllLinksMetaData() {
      if (!post?.urls?.length) return;

      setMetaDataLoading(true); // 메타데이터 로딩 시작

      const newLinksMetaData = new Map<string, LinkMetaData>();

      // 이미 있는 메타데이터는 유지
      linksMetaData.forEach((value, key) => {
        newLinksMetaData.set(key, value);
      });

      // 모든 URL에 대해 병렬로 메타데이터 가져오기
      await Promise.all(
        post.urls.map(async ({ url }) => {
          // 이미 메타데이터가 있거나 실패한 URL이면 스킵
          if (linksMetaData.has(url) || failedUrls.has(url)) return;

          try {
            // 타임아웃 설정 (5초)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${API_URL}/api/v1/link/preview`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "127.0.0.1",
                "X-Real-IP": "127.0.0.1",
              },
              credentials: "include",
              body: JSON.stringify({ url }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(
                `링크 메타데이터를 가져오는 데 실패했습니다: ${url}`
              );
            }

            const data = await response.json();
            if (data.data) {
              newLinksMetaData.set(url, data.data);
            }
          } catch (error) {
            console.error(`Error fetching metadata for ${url}:`, error);
            // 실패한 URL 기록
            setFailedUrls((prev) => {
              const newSet = new Set(prev);
              newSet.add(url);
              return newSet;
            });
          }
        })
      );

      setLinksMetaData(newLinksMetaData);
      setMetaDataLoading(false); // 메타데이터 로딩 완료
    }

    fetchAllLinksMetaData();
  }, [post?.urls]); // linksMetaData 의존성 제거

  // 좋아요 토글 API 호출
  const toggleLike = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/curation/like/${id}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-Forwarded-For": "127.0.0.1",
          "X-Real-IP": "127.0.0.1",
        },
      });

      if (!response.ok) {
        throw new Error("좋아요 처리 실패");
      }

      // 기존 post 상태를 업데이트하여 즉각적인 UI 반영
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likeCount: prev.likeCount + (prev.liked ? -1 : 1),
              liked: !prev.liked,
            }
          : prev
      );
    } catch (error) {
      console.error("좋아요 처리 중 오류:", error);
    }
  };

  // 큐레이션 삭제 처리
  const handleDeleteCuration = async () => {
    if (!confirm("정말로 이 큐레이션을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/curation/${id}`, {
        method: "DELETE",
        credentials: "include", // 쿠키를 포함하여 요청
        headers: {
          "X-Forwarded-For": "127.0.0.1", // IP 주소 헤더 추가 (테스트용)
          "X-Real-IP": "127.0.0.1", // 실제 IP 헤더 추가 (테스트용)
        },
      });

      if (!response.ok) {
        throw new Error("큐레이션 삭제에 실패했습니다.");
      }

      // 삭제 성공 시 홈으로 리다이렉트
      window.location.href = "/";
    } catch (error) {
      console.error("큐레이션 삭제 중 오류 발생:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 날짜 형식화 함수
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "유효하지 않은 날짜";
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
    } catch (error) {
      console.error("Date formatting error:", error);
      return "날짜 형식 오류";
    }
  };

  // URL에서 도메인 추출 함수
  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch (error) {
      console.error("URL parsing error:", error);
      return url;
    }
  };

  // 로딩 상태 처리 - 글 내용 로딩만 체크
  if (contentLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50 flex items-center justify-center min-h-[40vh]">
        <div>
          <h2 className="text-xl font-bold mb-2">오류가 발생했습니다</h2>
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-gray-500 p-4 border border-gray-200 rounded-md bg-gray-50 flex items-center justify-center min-h-[40vh]">
        <div>
          <h2 className="text-xl font-bold mb-2">데이터를 찾을 수 없습니다</h2>
          <p>요청하신 큐레이션 정보가 존재하지 않습니다.</p>
        </div>
      </div>
    );
  }

  // 수정 여부 확인
  const isModified =
    Math.floor(new Date(post.modifiedAt).getTime() / 1000) !==
    Math.floor(new Date(post.createdAt).getTime() / 1000);

  // URL 배열이 있는지 확인
  const hasUrls = post.urls && post.urls.length > 0;

  // 링크 클릭 처리 함수 추가
  const handleLinkClick = async (url: string, linkId?: number) => {
    if (!linkId) return;

    try {
      // 링크 클릭 시 백엔드에 조회수 증가 요청
      const response = await fetch(`${API_URL}/api/v1/link/${linkId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "X-Forwarded-For": "127.0.0.1",
          "X-Real-IP": "127.0.0.1",
        },
      });

      if (response.ok) {
        const result = await response.json();
      }
    } catch (error) {
      console.error("링크 클릭 처리 중 오류:", error);
    }
    window.location.reload();
  };

  // Add follow function
  const handleFollow = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/members/${post.authorName}/follow`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "X-Forwarded-For": "127.0.0.1",
            "X-Real-IP": "127.0.0.1",
          },
        }
      );

      if (!response.ok) {
        throw new Error("팔로우 처리 실패");
      }

      // 기존 post 상태를 업데이트하여 즉각적인 UI 반영
      setPost((prev) =>
        prev
          ? {
              ...prev,
              followed: true,
            }
          : prev
      );
    } catch (error) {
      console.error("팔로우 처리 중 오류:", error);
    }
  };

  // Add unfollow function
  const handleUnfollow = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/members/${post.authorName}/unfollow`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "X-Forwarded-For": "127.0.0.1",
            "X-Real-IP": "127.0.0.1",
          },
        }
      );

      if (!response.ok) {
        throw new Error("언팔로우 처리 실패");
      }

      // 기존 post 상태를 업데이트하여 즉각적인 UI 반영
      setPost((prev) =>
        prev
          ? {
              ...prev,
              followed: false,
            }
          : prev
      );
    } catch (error) {
      console.error("언팔로우 처리 중 오류:", error);
    }
  };

  return (
    <main className="container grid grid-cols-12 gap-6 px-4 py-6">
      <div className="col-span-12 lg:col-span-9">
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-black"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Link>

          {/* 큐레이션 수정/삭제 버튼 */}
          <div className="relative">
            <button
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </button>

            {showActionMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <Link
                    href={`/curation/${id}/edit`}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    큐레이션 수정
                  </Link>
                  <button
                    onClick={handleDeleteCuration}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    큐레이션 삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <article className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image
                src={post.authorImgUrl || "/placeholder.svg?height=40&width=40"}
                alt={post.authorName}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <p className="font-medium">{post.authorName}</p>
                <p className="text-xs text-gray-500">{`작성된 날짜: ${formatDate(
                  post.createdAt
                )}`}</p>
              </div>
            </div>
            {post.login ? (
              post.authorId !== Number(sessionStorage.getItem("userId")) && (
                <button
                  onClick={post.followed ? handleUnfollow : handleFollow}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    post.followed
                      ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {post.followed ? "팔로우중" : "팔로우"}
                </button>
              )
            ) : (
              <Link href="/auth/login">
                <button className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  로그인하고 팔로우
                </button>
              </Link>
            )}
          </div>

          <h1 className="text-3xl font-bold">{post.title}</h1>
          <div className="flex items-center space-x-2 mt-1 mb-4">
            <p className="text-sm text-gray-500">
              조회수 {post.viewCount || 0}
            </p>
          </div>

          {/* 링크 카드 섹션 - 여러 URL 지원 */}
          {hasUrls && (
            <div className="my-6 space-y-4">
              <h2 className="text-xl font-semibold">
                링크 ({post.urls.length}개)
              </h2>

              {/* 메타데이터 로딩 중 표시 */}
              {metaDataLoading && (
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                  링크 정보를 불러오는 중...
                </div>
              )}

              {post.urls.map(({ url, linkId }, index) => {
                const metaData = linksMetaData.get(url);
                const bgClass =
                  index % 3 === 0
                    ? "from-blue-50 to-indigo-50"
                    : index % 3 === 1
                    ? "from-green-50 to-teal-50"
                    : "from-purple-50 to-pink-50";

                return (
                  <div
                    key={`${url}-${index}`}
                    className="rounded-lg border shadow-sm overflow-hidden"
                  >
                    <div className={`bg-gradient-to-r ${bgClass} p-6`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center">
                        <div className="mr-0 sm:mr-4 mb-4 sm:mb-0 flex-shrink-0">
                          {metaData?.image ? (
                            <Image
                              src={
                                metaData.image ||
                                "/placeholder.svg?height=80&width=80"
                              }
                              alt="링크 썸네일"
                              width={80}
                              height={80}
                              className="rounded-md object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center">
                              <LinkIcon className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-xl font-semibold text-gray-900 mb-1">
                            {metaData?.title || extractDomain(url) || "링크"}
                          </h2>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {metaData?.description || url}
                          </p>
                          <div className="flex items-center text-sm">
                            <span className="text-blue-600 truncate max-w-[200px]">
                              {extractDomain(url)}
                            </span>
                            <span className="mx-2 text-gray-300">|</span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-gray-700"
                              onClick={() =>
                                handleLinkClick(url, metaData?.linkId || linkId)
                              }
                            >
                              바로가기
                            </a>
                            <span className="mx-2 text-gray-300">|</span>
                            <div className="flex items-center text-gray-500">
                              <MousePointer className="h-3 w-3 mr-1" />
                              <span>{metaData?.click || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag: { name: string }) => (
              <span
                key={tag.name}
                className={`rounded-full px-2 py-1 text-xs font-medium ${
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

          <div
            className="prose prose-sm sm:prose lg:prose-lg max-w-none ql-editor-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="flex items-center justify-between border-t border-b py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLike}
                className="flex items-center space-x-1 text-sm"
              >
                <Heart
                  className={`h-5 w-5 ${
                    post.liked ? "text-red-500 fill-red-500" : "text-gray-500"
                  }`}
                />
                <span className="font-medium">{post.likeCount}</span>
              </button>
              <button className="flex items-center space-x-1 text-sm text-gray-500">
                <MessageSquare className="h-5 w-5" />
                <span>{post.comments?.length || 0}</span>
              </button>
            </div>
            <div className="flex space-x-2">
              <button className="rounded-md border p-2 hover:bg-gray-50">
                <Bookmark className="h-5 w-5 text-gray-500" />
              </button>
              <button className="rounded-md border p-2 hover:bg-gray-50">
                <Share2 className="h-5 w-5 text-gray-500" />
              </button>
              <button
                className="rounded-md border p-2 hover:bg-gray-50 hover:text-red-500"
                onClick={() => setShowReportModal(true)}
              >
                <Flag className="h-5 w-5 text-gray-500 hover:text-red-500" />
              </button>
            </div>
          </div>

          {/* 댓글 섹션 */}
          <CommentSection postId={id} />
        </article>
      </div>

      <div className="col-span-12 lg:col-span-3">
        <div className="sticky top-6 space-y-6">
          <RightSidebar />

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">이 글의 작성자</h3>
            <div className="flex items-center space-x-3">
              <Image
                src={post.authorImgUrl || "/placeholder.svg?height=48&width=48"}
                alt={post.authorName}
                width={48}
                height={48}
                className="rounded-full"
              />
              <div>
                <p className="font-medium">{post.authorName}</p>
                <p className="text-xs text-gray-500">15개의 글 작성</p>
              </div>
            </div>
            {post.login ? (
              post.authorId !== Number(sessionStorage.getItem("userId")) && (
                <button
                  onClick={post.followed ? handleUnfollow : handleFollow}
                  className={`mt-3 w-full px-4 py-2 rounded-md transition-colors ${
                    post.followed
                      ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {post.followed ? "팔로우중" : "팔로우"}
                </button>
              )
            ) : (
              <Link href="/auth/login">
                <button className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  로그인하고 팔로우
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* 신고 모달 */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        curationId={Number(id)}
      />
    </main>
  );
}
