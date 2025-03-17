"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Edit,
  Eye,
  LinkIcon,
  Share2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import AddLinkButton from "@/app/components/add-link-button";
import PlaylistItems from "@/app/components/playlist-items";
import LikeButton from "@/app/components/like-button";
import type { Playlist } from "@/types/playlist";

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [recommendedPlaylists, setRecommendedPlaylists] = useState<Playlist[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousPath, setPreviousPath] = useState<string>("/playlists"); // 기본값 설정
  const [refreshKey, setRefreshKey] = useState(0); // 강제 리렌더링을 위한 키
  const [hasRetried, setHasRetried] = useState(false); // 재시도 여부 (한 번만 시도)

  // 이전 경로 확인 로직 개선
  useEffect(() => {
    // document.referrer를 우선 확인 (직전에 방문한 페이지)
    const referrer = document.referrer;
    const referrerUrl = referrer ? new URL(referrer) : null;
    const referrerPath = referrerUrl?.pathname || "";

    // referrer가 있고 로컬 사이트인 경우 이를 우선 사용
    if (referrerPath && referrerUrl?.host === window.location.host) {
      if (referrerPath.includes("/explore/playlists")) {
        setPreviousPath("/explore/playlists");
        sessionStorage.setItem("playlistReturnPath", "/explore/playlists");
      } else if (
        referrerPath.includes("/playlists") &&
        !referrerPath.includes(`/playlists/${params.id}`)
      ) {
        setPreviousPath("/playlists");
        sessionStorage.setItem("playlistReturnPath", "/playlists");
      }
    }
    // referrer가 없는 경우 세션 스토리지 사용
    else {
      const storedReturnPath = sessionStorage.getItem("playlistReturnPath");
      if (storedReturnPath) {
        setPreviousPath(storedReturnPath);
      } else {
        // 저장된 이전 경로가 없으면 일반 이전 경로 확인
        const storedPreviousPath = sessionStorage.getItem("previousPath");
        if (storedPreviousPath) {
          if (storedPreviousPath.includes("/explore/playlists")) {
            setPreviousPath("/explore/playlists");
            sessionStorage.setItem("playlistReturnPath", "/explore/playlists");
          } else if (
            storedPreviousPath.includes("/playlists") &&
            !storedPreviousPath.includes(`/playlists/${params.id}`)
          ) {
            setPreviousPath("/playlists");
            sessionStorage.setItem("playlistReturnPath", "/playlists");
          }
        }
      }
    }
  }, [params.id]);

  const fetchData = useCallback(
    async (incrementView = true) => {
      setIsLoading(true);
      setError(null); // 오류 상태 초기화

      try {
        // 현재 타임스탬프를 가져옵니다.
        const timestamp = new Date().getTime();

        // 쿼리 파라미터 배열 생성
        const queryParams = [];
        if (!incrementView) {
          queryParams.push("noIncrement=true");
        }
        queryParams.push(`_t=${timestamp}`);
        const queryString =
          queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

        // 플레이리스트 데이터 가져오기
        const response = await fetch(
          `http://52.78.27.224/api/v1/playlists/${params.id}${queryString}`,
          {
            ...(sessionStorage.getItem("isLoggedIn") === "true"
              ? { credentials: "include" }
              : {}),
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
            signal: AbortSignal.timeout(10000),
          }
        );

        // 응답 상태 확인
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("플레이리스트를 찾을 수 없습니다.");
          }
          const errorText = await response.text();
          let errorMessage =
            "플레이리스트 데이터를 불러오는 중 오류가 발생했습니다.";
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            console.error("오류 응답 파싱 실패:", e);
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        if (!result || !result.data) {
          throw new Error("플레이리스트 데이터가 없습니다.");
        }

        // 디버깅 로그
        console.log("플레이리스트 데이터:", result.data);
        console.log("플레이리스트 소유자 여부:", result.data.owner);

        // 아이템이 없을 경우 빈 배열로 초기화
        if (!result.data.items) {
          result.data.items = [];
        }

        setPlaylist(result.data);

        // 로그인 상태인 경우 좋아요 상태 확인 및 세션 스토리지에 저장
        if (sessionStorage.getItem("isLoggedIn") === "true") {
          try {
            const likeStatusResponse = await fetch(
              `http://52.78.27.224/api/v1/playlists/${params.id}/like/status?_t=${timestamp}`,
              {
                credentials: "include",
                cache: "no-store",
                headers: {
                  "Cache-Control": "no-cache, no-store, must-revalidate",
                  Pragma: "no-cache",
                  Expires: "0",
                },
                signal: AbortSignal.timeout(5000),
              }
            );

            if (likeStatusResponse.ok) {
              const likeStatusData = await likeStatusResponse.json();
              const likeStatus = Boolean(likeStatusData.data);
              console.log(`좋아요 상태 확인 결과: ${likeStatus}`);
              sessionStorage.setItem(
                `playlist_like_${params.id}`,
                String(likeStatus)
              );
            } else {
              console.log("좋아요 상태 확인 API 실패: 기본값 false로 설정");
              sessionStorage.setItem(`playlist_like_${params.id}`, "false");
            }
          } catch (error) {
            console.error("좋아요 상태 확인 오류:", error);
            sessionStorage.setItem(`playlist_like_${params.id}`, "false");
          }
        }

        // 추천 플레이리스트 가져오기 (실패해도 무시)
        try {
          const recResponse = await fetch(
            `http://52.78.27.224/api/v1/playlists/${params.id}/recommendation?_t=${timestamp}`,
            {
              ...(sessionStorage.getItem("isLoggedIn") === "true"
                ? { credentials: "include" }
                : {}),
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
              signal: AbortSignal.timeout(5000),
            }
          );

          if (recResponse.ok) {
            const recResult = await recResponse.json();
            setRecommendedPlaylists(recResult.data || []);
          } else {
            setRecommendedPlaylists([]);
          }
        } catch (recError) {
          console.error("추천 플레이리스트 로딩 오류:", recError);
          setRecommendedPlaylists([]);
        }
      } catch (err) {
        console.error("데이터 로딩 오류:", err);
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("서버 응답 시간이 너무 오래 걸립니다. 다시 시도해주세요.");
        } else {
          setError((err as Error).message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [params.id]
  );

  // 소유자 확인 로직을 개선하는 함수 수정
  const isPlaylistOwner = () => {
    // 로그인하지 않은 경우 항상 false 반환
    if (sessionStorage.getItem("isLoggedIn") !== "true") {
      return false;
    }

    // API에서 제공하는 owner 필드 사용
    return playlist?.owner === true;
  };

  // 수동 새로고침 함수
  const handleManualRefresh = () => {
    setHasRetried(false); // 재시도 플래그 초기화
    fetchData(false); // 조회수 증가 없이 데이터만 새로고침
  };

  // useEffect 수정 - 좋아요 상태 변경 이벤트 리스너 추가
  useEffect(() => {
    if (params.id) {
      // 페이지 첫 로드 시에만 조회수를 증가시킵니다
      const hasVisited = sessionStorage.getItem(
        `visited_playlist_${params.id}`
      );

      if (!hasVisited) {
        // 아직 방문하지 않은 경우 조회수 증가
        fetchData(true);
        // 방문 기록 저장 (세션 동안 유지)
        sessionStorage.setItem(`visited_playlist_${params.id}`, "true");
      } else {
        // 이미 방문한 경우 조회수 증가 없이 데이터만 가져옴
        fetchData(false);
      }

      // 좋아요 상태 변경 이벤트 리스너 추가
      const handleLikeChanged = (event: CustomEvent) => {
        const { playlistId: changedPlaylistId } = event.detail;

        console.log(
          `좋아요 이벤트 수신 (페이지): playlistId=${changedPlaylistId}, 현재 페이지 ID=${params.id}`
        );

        // 현재 페이지의 플레이리스트 ID와 일치하는 경우 데이터 새로고침
        if (Number(changedPlaylistId) === Number(params.id)) {
          console.log("좋아요 상태 변경으로 인한 데이터 새로고침");
          // 조회수 증가 없이 데이터만 새로고침
          fetchData(false);
          // 강제 리렌더링을 위한 키 업데이트
          setRefreshKey((prev) => prev + 1);
        }
      };

      window.addEventListener(
        "playlist-like-changed",
        handleLikeChanged as EventListener
      );

      return () => {
        window.removeEventListener(
          "playlist-like-changed",
          handleLikeChanged as EventListener
        );
      };
    }
  }, [params.id, fetchData]);

  if (isLoading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="container py-6 max-w-6xl mx-auto">
        <div className="mb-4">
          <Link
            href={previousPath}
            className="inline-flex items-center text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {previousPath.includes("explore")
              ? "플레이리스트 탐색으로 돌아가기"
              : "플레이리스트 목록으로 돌아가기"}
          </Link>
        </div>

        <div className="p-6 bg-red-50 text-red-600 rounded-lg border border-red-200">
          <h2 className="text-xl font-bold mb-2">오류가 발생했습니다</h2>
          <p>{error || "플레이리스트를 찾을 수 없습니다."}</p>
          <div className="mt-4">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleManualRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-6xl mx-auto">
      {/* 상단 뒤로가기 링크 */}
      <div className="mb-4">
        <Link
          href={previousPath}
          className="inline-flex items-center text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {previousPath.includes("explore")
            ? "플레이리스트 탐색으로 돌아가기"
            : "플레이리스트 목록으로 돌아가기"}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 메인 플레이리스트 영역 */}
        <div className="lg:col-span-3">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {playlist.title}
                  </h1>
                  {playlist.tags &&
                    Array.isArray(playlist.tags) &&
                    playlist.tags.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {playlist.tags.join(", ")}
                      </Badge>
                    )}
                </div>
                {playlist.description && (
                  <p className="text-muted-foreground mt-2 max-w-2xl">
                    {playlist.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-start">
                <LikeButton
                  key={`like-button-${refreshKey}`}
                  playlistId={playlist.id}
                  initialLikes={playlist.likeCount}
                  onUnlike={() => {
                    console.log("좋아요 취소 콜백 실행");
                    // 좋아요 취소 시 세션 스토리지 업데이트
                    sessionStorage.setItem(
                      `playlist_like_${playlist.id}`,
                      "false"
                    );
                    // 데이터 새로고침
                    fetchData(false);
                  }}
                />

                {/* 소유자 확인 로직 개선 - owner 필드 사용 */}
                {isPlaylistOwner() && (
                  <>
                    <AddLinkButton playlistId={playlist.id} />
                    <Link href={`/playlists/${playlist.id}/edit`}>
                      <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">편집</span>
                      </Button>
                    </Link>
                  </>
                )}

                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                  <span className="sr-only">공유</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Bookmark className="h-4 w-4 mr-1" />
                <span>
                  {new Date(playlist.createdAt).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  생성
                </span>
              </div>
              <div className="flex items-center">
                <LinkIcon className="h-4 w-4 mr-1" />
                <span>{playlist.items?.length || 0}개 링크</span>
              </div>
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                <span>{playlist.viewCount.toLocaleString()} 조회</span>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {playlist.items && playlist.items.length > 0 ? (
            <PlaylistItems
              playlistId={playlist.id}
              items={playlist.items}
              isOwner={isPlaylistOwner()}
              onItemsChanged={() => {
                console.log("아이템 변경 감지 - 데이터 새로고침");
                fetchData(false);
              }}
            />
          ) : (
            <div className="text-center py-12">
              <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">아직 링크가 없습니다</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                이 플레이리스트에 링크를 추가해보세요.
              </p>

              {/* 소유자인 경우에만 링크 추가 버튼 표시 */}
              {isPlaylistOwner() && (
                <AddLinkButton
                  playlistId={playlist.id}
                  onLinkAdded={() => {
                    // 새 링크가 추가되면 플레이리스트 데이터를 다시 가져옵니다
                    console.log("링크 추가 감지 - 데이터 새로고침");
                    fetchData(false);
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* 추천 플레이리스트 사이드바 */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h3 className="text-lg font-semibold mb-4">추천 플레이리스트</h3>
            {recommendedPlaylists.length > 0 ? (
              <div className="space-y-4">
                {recommendedPlaylists.map((rec: Playlist) => (
                  <Card
                    key={rec.id}
                    className="overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <Link href={`/playlists/${rec.id}`}>
                      <CardContent className="p-4">
                        <h4 className="font-medium line-clamp-1">
                          {rec.title}
                        </h4>
                        {rec.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {rec.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            <span>{rec.items?.length || 0}</span>
                          </div>
                          <LikeButton
                            key={`rec-like-${rec.id}-${refreshKey}`}
                            playlistId={rec.id}
                            initialLikes={rec.likeCount}
                            size="sm"
                          />
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                추천할 플레이리스트가 없습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
