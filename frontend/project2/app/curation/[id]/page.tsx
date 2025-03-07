"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  ArrowLeft,
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

export default function PostDetail({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<CurationData | null>(null);
  const [linkMetaData, setLinkMetaData] = useState<LinkMetaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API 데이터 호출
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:8080/api/v1/curation/${params.id}`
        );

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
  }, [params.id]);

  // 링크 메타데이터 가져오기
  useEffect(() => {
    if (!post?.urls?.[0]?.url) return;

    async function fetchLinkMetaData() {
      try {
        const response = await fetch(
          `http://localhost:8080/api/v1/link/preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: post.urls[0].url }),
          }
        );

        if (!response.ok) {
          throw new Error("링크 메타데이터를 가져오는 데 실패했습니다.");
        }

        const data = await response.json();
        setLinkMetaData(data.data);
      } catch (error) {
        console.error("Error fetching link metadata:", error);
        setLinkMetaData(null);
      }
    }

    fetchLinkMetaData();
  }, [post?.urls]);

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

  return (
    <main className="container grid grid-cols-12 gap-6 px-4 py-6">
      <div className="col-span-12 lg:col-span-9">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-black"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Link>
        </div>

        <article className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image
                src={post.authorImage || "/placeholder.svg?height=40&width=40"}
                alt={post.authorName}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <p className="font-medium">{post.authorName}</p>
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

          {/* 링크 카드 */}
          {post.urls?.[0]?.url && (
            <div className="my-6 rounded-lg border shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center">
                  <div className="mr-0 sm:mr-4 mb-4 sm:mb-0 flex-shrink-0">
                    <Image
                      src={
                        linkMetaData?.image ||
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
                      {linkMetaData?.title || "링크 제목을 불러오는 중..."}
                    </h2>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {linkMetaData?.description || post.content}
                    </p>
                    <div className="flex items-center text-sm">
                      <span className="text-blue-600 truncate max-w-[200px]">
                        {new URL(post.urls[0].url).hostname}
                      </span>
                      <span className="mx-2 text-gray-300">|</span>
                      <a
                        href={post.urls[0].url}
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
          <CommentSection postId={params.id} />
        </article>
      </div>

      <div className="col-span-12 lg:col-span-3">
        <div className="sticky top-6 space-y-6">
          <RightSidebar />

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">이 글의 작성자</h3>
            <div className="flex items-center space-x-3">
              <Image
                src={post.authorImage || "/placeholder.svg?height=48&width=48"}
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
            <button className="mt-3 w-full rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">
              팔로우
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
