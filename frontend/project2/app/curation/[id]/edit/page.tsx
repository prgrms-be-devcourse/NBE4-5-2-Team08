"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation"; // `useParams`를 사용하여 params를 받아옵니다.
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  ArrowLeft,
  Edit,
  Trash2,
  MoreVertical,
  MousePointer,
  Flag,
  LinkIcon,
  Bookmark,
} from "lucide-react";
import RightSidebar from "@/app/components/right-sidebar";
import CommentSection from "@/app/components/comment-section";
import ReportModal from "@/app/components/report-modal";
import ShareButton from "@/app/components/share-button";
import AddToPlaylistModal from "@/app/components/add-to-playlist-modal";

// API URL을 하드코딩된 값에서 환경 변수로 변경합니다.
// 파일 상단에 다음 상수를 추가합니다:
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://52.78.27.224";

// Update the CurationData interface to ensure the click property is included
interface CurationData {
  id: number;
  title: string;
  content: string;
  authorId: number;
  authorName: string;
  authorImgUrl: string;
  createdAt: string;
  modifiedAt: string;
  urls: {
    url: string;
    title: string;
    description: string;
    imageUrl: string;
    linkId?: number;
    id?: number;
    click?: number; // Make sure this is included
  }[];
  tags: { name: string }[];
  likeCount: number;
  viewCount: number;
  comments: {
    commentId: number;
    authorId: number;
    authorName: string;
    authorImgUrl: string;
    content: string;
    createdAt: string;
    modifiedAt: string;
    replies: any[];
  }[];
  liked: boolean;
  login: boolean;
  followed: boolean;
}

export default function PostDetail() {
  const { id } = useParams(); // useParams로 id 값을 받습니다.
  const [post, setPost] = useState<CurationData | null>(null);
  // 로딩 상태 분리 - 글 내용과 메타데이터 로딩을 별도로 관리
  const [contentLoading, setContentLoading] = useState(true); // 글 내용 로딩 상태
  const [error, setError] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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

  // 좋아요 토글 API 호출
  const toggleLike = async () => {
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

  // 링크 클릭 처리 함수 수정
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
        console.log("Link click recorded:", result);

        // 링크 클릭 후 새 탭에서 URL 열기
        window.open(url, "_blank");

        // 필요하다면 UI 업데이트를 위해 post 상태 업데이트
        if (result.data && result.data.click !== undefined) {
          // 해당 링크의 클릭 수 업데이트
          setPost((prev) => {
            if (!prev) return prev;

            const updatedUrls = prev.urls.map((urlItem) => {
              if (urlItem.linkId === linkId || urlItem.id === linkId) {
                return { ...urlItem, click: result.data.click };
              }
              return urlItem;
            });

            return { ...prev, urls: updatedUrls };
          });
        }
      }
    } catch (error) {
      console.error("링크 클릭 처리 중 오류:", error);
      // 에러가 발생해도 링크는 열어줌
      window.open(url, "_blank");
    }
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
                    onClick={() => {
                      setShowAddToPlaylistModal(true);
                      setShowActionMenu(false);
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Bookmark className="mr-2 h-4 w-4" />
                    플레이리스트에 추가
                  </button>
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
          {/* Replace the author information section with: */}
          <div className="flex items-center gap-2 mt-4">
            <Link href={`/${post.authorName}`}>
              <Image
                src={post.authorImgUrl || "/default-profile.svg"}
                alt={`${post.authorName}'s profile`}
                width={40}
                height={40}
                className="rounded-full cursor-pointer"
              />
            </Link>
            <Link
              href={`/${post.authorName}`}
              className="text-sm font-medium hover:underline cursor-pointer"
            >
              {post.authorName}
            </Link>
            <span className="text-sm text-gray-500">
              {formatDate(post.createdAt)}
            </span>
          </div>

          <h1 className="text-3xl font-bold">{post.title}</h1>
          <div className="flex items-center space-x-2 mt-1 mb-4">
            <p className="text-sm text-gray-500">
              조회수 {post.viewCount || 0}
            </p>
          </div>

          {/* Update the link card section in the return statement to display the click count */}
          {hasUrls && (
            <div className="my-6 space-y-4">
              <h2 className="text-xl font-semibold">
                링크 ({post.urls.length}개)
              </h2>

              {post.urls.map(
                (
                  {
                    url,
                    title,
                    description,
                    imageUrl,
                    linkId,
                    id: urlId,
                    click,
                  },
                  index
                ) => {
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
                            {imageUrl ? (
                              <Image
                                src={
                                  imageUrl ||
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
                              {title || extractDomain(url) || "링크"}
                            </h2>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {description || url}
                            </p>
                            <div className="flex items-center text-sm">
                              <span className="text-blue-600 truncate max-w-[200px]">
                                {extractDomain(url)}
                              </span>
                              <span className="mx-2 text-gray-300">|</span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault(); // 이벤트 버블링 방지
                                  handleLinkClick(url, linkId || urlId);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                바로가기
                              </button>
                              <span className="mx-2 text-gray-300">|</span>
                              <div className="flex items-center text-gray-500">
                                <MousePointer className="h-3 w-3 mr-1" />
                                <span>{click !== undefined ? click : 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
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
                className={`flex items-center space-x-1 text-sm ${
                  sessionStorage.getItem("isLoggedIn") === "true"
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-70"
                }`}
                disabled={sessionStorage.getItem("isLoggedIn") !== "true"}
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
              <ShareButton
                id={Number(id)}
                className="rounded-md border p-2 hover:bg-gray-50"
              />
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
            {/* Replace the sidebar author information section with: */}
            <div className="flex items-center gap-2 mb-4">
              <Link href={`/${post.authorName}`}>
                <Image
                  src={post.authorImgUrl || "/default-profile.svg"}
                  alt={`${post.authorName}'s profile`}
                  width={32}
                  height={32}
                  className="rounded-full cursor-pointer"
                />
              </Link>
              <Link
                href={`/${post.authorName}`}
                className="text-sm font-medium hover:underline cursor-pointer"
              >
                {post.authorName}
              </Link>
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
      {/* 플레이리스트 추가 모달 */}
      <AddToPlaylistModal
        isOpen={showAddToPlaylistModal}
        onClose={() => setShowAddToPlaylistModal(false)}
        curationId={Number(id)}
      />
    </main>
  );
}
