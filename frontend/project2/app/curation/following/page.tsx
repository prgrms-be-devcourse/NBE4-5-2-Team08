"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageSquare, Bookmark, Share2, LinkIcon } from "lucide-react";
import CurationSkeleton from "@/app/components/skeleton/curation-skeleton";
import { stripHtml } from "@/lib/htmlutils";

// Curation 데이터 인터페이스 정의
interface Curation {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
  likeCount: number;
  urls: { url: string }[];
  tags: { name: string }[];
}

// Link 메타 데이터 인터페이스 정의
interface LinkMetaData {
  url: string;
  title: string;
  description: string;
  image: string;
}

export default function FollowingCurations() {
  const [curations, setCurations] = useState<Curation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [linkMetaDataList, setLinkMetaDataList] = useState<{
    [key: number]: LinkMetaData[];
  }>({});
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  // API 요청 함수
  const fetchFollowingCurations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://localhost:8080/api/v1/curation/following",
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error(
          "팔로우 중인 큐레이터의 큐레이션을 불러오지 못했습니다."
        );
      }

      const data = await response.json();
      if (data && data.data) {
        setCurations(data.data);
      } else {
        console.error("No data found in the response");
        setCurations([]);
      }
    } catch (error) {
      console.error("Error fetching following curations:", error);
      setError((error as Error).message);
    } finally {
      // 스켈레톤 UI가 잠시 보이도록 약간의 지연 추가 (실제 환경에서는 제거 가능)
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  // 메타 데이터 추출 함수
  const fetchLinkMetaData = async (url: string, curationId: number) => {
    // 이미 실패한 URL이면 다시 요청하지 않음
    if (failedUrls.has(url)) return;

    try {
      // 타임아웃 설정 (5초)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `http://localhost:8080/api/v1/link/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: url }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to fetch link metadata");
      }

      const data = await response.json();
      setLinkMetaDataList((prev) => {
        const existingMetaData = prev[curationId] || [];
        // 중복된 메타 데이터가 추가되지 않도록 필터링
        const newMetaData = existingMetaData.filter(
          (meta) => meta.url !== data.data.url // 이미 존재하는 URL은 제외
        );
        return {
          ...prev,
          [curationId]: [...newMetaData, data.data], // 중복 제거 후 메타 데이터 추가
        };
      });
    } catch (error) {
      console.error(`Error fetching metadata for ${url}:`, error);
      // 실패한 URL 기록
      setFailedUrls((prev) => {
        const newSet = new Set(prev);
        newSet.add(url);
        return newSet;
      });
    }
  };

  // 큐레이션마다 메타 데이터 추출
  useEffect(() => {
    curations.forEach((curation) => {
      if (curation.urls && curation.urls.length > 0) {
        curation.urls.forEach((urlObj) => {
          // 이미 메타데이터가 있거나 실패한 URL이면 스킵
          if (
            linkMetaDataList[curation.id]?.some(
              (meta) => meta.url === urlObj.url
            ) ||
            failedUrls.has(urlObj.url)
          ) {
            return;
          }
          fetchLinkMetaData(urlObj.url, curation.id);
        });
      }
    });
  }, [curations]); // linkMetaDataList 의존성 제거

  // 좋아요 추가 API 호출 함수
  const likeCuration = async (id: number) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/curation/${id}`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to like the post");
      }

      // 좋아요를 추가한 후, 데이터를 다시 불러와서 화면 갱신
      fetchFollowingCurations();
    } catch (error) {
      console.error("Error liking the post:", error);
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

  useEffect(() => {
    fetchFollowingCurations();
  }, []);

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
            curations.map((curation) => (
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
                  <button className="mt-2 text-sm font-medium text-blue-600">
                    더보기
                  </button>
                </div>

                {/* 태그 표시 */}
                <div className="flex space-x-2 mt-2">
                  {curation.tags.map((tag, index) => (
                    <span
                      key={`${tag.name}-${index}`}
                      className="px-3 py-1 text-sm font-medium rounded-full bg-gray-200 text-gray-600"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                {/* 메타 데이터 카드 */}
                {curation.urls.map((urlObj, index) => {
                  const metaData = linkMetaDataList[curation.id]?.find(
                    (meta) => meta.url === urlObj.url
                  );

                  return (
                    <Link
                      key={`${urlObj.url}-${index}`}
                      href={urlObj.url}
                      passHref
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="mt-4 rounded-lg border p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                        {metaData ? (
                          <div className="flex items-center space-x-3">
                            <img
                              src={
                                metaData.image ||
                                "/placeholder.svg?height=48&width=48"
                              }
                              alt="Preview"
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                            <div>
                              <h3 className="font-medium">
                                {metaData.title || "링크"}
                              </h3>
                              <p className="text-sm text-gray-600 line-clamp-1">
                                {metaData.description || urlObj.url}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <LinkIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="font-medium">링크</h3>
                              <p className="text-sm text-gray-600 truncate">
                                {urlObj.url}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      className="flex items-center space-x-1 text-sm text-gray-500"
                      onClick={() => likeCuration(curation.id)}
                    >
                      <Heart className="h-4 w-4" />
                      <span>{curation.likeCount}</span>
                    </button>
                    <button className="flex items-center space-x-1 text-sm text-gray-500">
                      <MessageSquare className="h-4 w-4" />
                      <span>12</span>
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button>
                      <Bookmark className="h-4 w-4 text-gray-500" />
                    </button>
                    <button>
                      <Share2 className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
