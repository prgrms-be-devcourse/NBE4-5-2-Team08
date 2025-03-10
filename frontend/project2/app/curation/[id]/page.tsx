"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation"; // useParams import 추가
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
} from "lucide-react";
import RightSidebar from "@/app/components/right-sidebar";
import CommentSection from "@/app/components/comment-section";

// 큐레이션 데이터 타입
interface CurationData {
  title: string;
  content: string;
  authorName: string;
  authorImage: string;
  createdAt: string;
  modifiedAt: string;
  urls: { url: string }[];
  tags: { name: string }[];
  likes: number;
  comments: { authorName: string; content: string }[]; // 댓글
}

// 링크 메타데이터 타입
interface LinkMetaData {
  title: string;
  description: string;
  image: string;
  url: string;
}

export default function CurationDetail() {
  const { id } = useParams(); // useParams 훅으로 id 가져오기
  const [post, setPost] = useState<CurationData | null>(null);
  const [linksMetaData, setLinksMetaData] = useState<Map<string, LinkMetaData>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // API 데이터 호출
  useEffect(() => {
    if (!id) return; // id가 없으면 fetch 실행하지 않음

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`http://localhost:8080/api/v1/curation/${id}`);

        if (!response.ok) {
          throw new Error("큐레이션 데이터를 가져오는 데 실패했습니다.");
        }

        const data = await response.json();
        setPost(data.data);
      } catch (err) {
        setError((err as Error).message);
        console.error("Error fetching curation data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]); // ✅ id를 의존성으로 추가

  // 모든 링크의 메타데이터 가져오기
  useEffect(() => {
    if (!post?.urls?.length) return;

    // 각 URL에 대한 메타데이터 가져오기
    async function fetchAllLinksMetaData() {
      const newLinksMetaData = new Map<string, LinkMetaData>();

      // 모든 URL에 대해 병렬로 메타데이터 가져오기
      await Promise.all(
        post!.urls.map(async ({ url }) => {
          try {
            const response = await fetch(
              `http://localhost:8080/api/v1/link/preview`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
              }
            );

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
          }
        })
      );

      setLinksMetaData(newLinksMetaData);
    }

    fetchAllLinksMetaData();
  }, [post?.urls]);

  // 큐레이션 삭제 처리
  const handleDeleteCuration = async () => {
    if (!confirm("정말로 이 큐레이션을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/curation/${id}`,
        {
          method: "DELETE",
        }
      );

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

  // 로딩 상태 처리
  if (loading) {
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
              <Link href={`/${post.authorName}`} className="group">
                <Image
                  src={
                    post.authorImage || "/placeholder.svg?height=40&width=40"
                  }
                  alt={post.authorName}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              </Link>
              <div>
                <Link href={`/${post.authorName}`} className="group">
                  <p className="font-medium">{post.authorName}</p>
                </Link>
                <p className="text-xs text-gray-500">
                  {isModified
                    ? `수정된 날짜: ${formatDate(post.modifiedAt)}`
                    : `작성된 날짜: ${formatDate(post.createdAt)}`}
                </p>
              </div>
            </div>
            <button className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">
              팔로우
            </button>
          </div>

          <h1 className="text-3xl font-bold">{post.title}</h1>

          {/* 링크 카드 섹션 - 여러 URL 지원 */}
          {hasUrls && (
            <div className="my-6 space-y-4">
              <h2 className="text-xl font-semibold">
                링크 ({post.urls.length}개)
              </h2>

              {/* 각 URL마다 별도의 카드 생성 */}
              {post.urls.map(({ url }, index) => (
                <div
                  key={`${url}-${index}`}
                  className="rounded-lg border shadow-sm overflow-hidden"
                >
                  <div
                    className={`bg-gradient-to-r ${
                      index % 3 === 0
                        ? "from-blue-50 to-indigo-50"
                        : index % 3 === 1
                        ? "from-green-50 to-teal-50"
                        : "from-purple-50 to-pink-50"
                    } p-6`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                      <div className="mr-0 sm:mr-4 mb-4 sm:mb-0 flex-shrink-0">
                        <Image
                          src={
                            linksMetaData.get(url)?.image ||
                            "/placeholder.svg?height=80&width=80"
                          }
                          alt="링크 썸네일"
                          width={80}
                          height={80}
                          className="rounded-md object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">
                          {linksMetaData.get(url)?.title ||
                            "링크 제목을 불러오는 중..."}
                        </h2>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {linksMetaData.get(url)?.description ||
                            "설명을 불러오는 중..."}
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
                          >
                            바로가기
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
            className="prose prose-sm sm:prose lg:prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="flex items-center justify-between border-t border-b py-4">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-1 text-sm">
                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                <span className="font-medium">{post.likes}</span>
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
            </div>
          </div>

          {/* 댓글 섹션 */}
          {typeof id === "string" && <CommentSection postId={id} />}
        </article>
      </div>

      <div className="col-span-12 lg:col-span-3">
        <div className="sticky top-6 space-y-6">
          <RightSidebar />

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">이 글의 작성자</h3>
            <div className="flex items-center space-x-3">
              <Link href={`/${post.authorName}`} className="group">
                <Image
                  src={
                    post.authorImage || "/placeholder.svg?height=48&width=48"
                  }
                  alt={post.authorName}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              </Link>
              <div>
                <Link href={`/${post.authorName}`} className="group">
                  <p className="font-medium">{post.authorName}</p>
                </Link>
                <p className="text-xs text-gray-500">15개의 글 작성</p>
              </div>
            </div>
            <button className="mt-3 w-full rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">
              팔로우
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
