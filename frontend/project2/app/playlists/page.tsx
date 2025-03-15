"use client";

import PlaylistGrid from "@/app/components/playlist-grid";
import LikedPlaylistGrid from "@/app/components/liked-playlist-grid";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlaylistsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("my");
  const [likedPlaylists, setLikedPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = async () => {
      // 세션 스토리지에서 로그인 상태 확인
      const savedLoginStatus = sessionStorage.getItem("isLoggedIn");

      if (savedLoginStatus === "true") {
        setIsLoggedIn(true);
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:8080/api/v1/members/me",
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          setIsLoggedIn(true);
          sessionStorage.setItem("isLoggedIn", "true");
        } else {
          setIsLoggedIn(false);
          sessionStorage.removeItem("isLoggedIn");

          // 로그인이 필요한 탭인 경우 에러 메시지 설정
          if (activeTab === "my") {
            setError("로그인이 필요한 서비스입니다.");
          }
        }
      } catch (error) {
        console.error("로그인 상태 확인 오류:", error);
        setIsLoggedIn(false);
        sessionStorage.removeItem("isLoggedIn");
      }
    };

    checkLoginStatus();
  }, [activeTab]);

  // URL에서 탭 파라미터 가져오기
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "liked") {
      setActiveTab("liked");
    } else {
      setActiveTab("my");
    }
  }, [searchParams]);

  // 좋아요한 플레이리스트 가져오기
  useEffect(() => {
    async function fetchLikedPlaylists() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(
          "http://localhost:8080/api/v1/playlists/liked",
          {
            credentials: "include",
          }
        );

        if (!res.ok) {
          if (res.status === 401) {
            setError("좋아요한 플레이리스트를 보려면 로그인이 필요합니다.");
            setIsLoggedIn(false);
            return;
          }
          throw new Error("좋아요한 플레이리스트를 불러오지 못했습니다.");
        }

        const result = await res.json();
        setLikedPlaylists(result.data || []);
      } catch (error) {
        console.error("좋아요한 플레이리스트 로딩 실패", error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    if (activeTab === "liked") {
      fetchLikedPlaylists();
    }
  }, [activeTab]);

  // 탭 변경 핸들러
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setError(null);
    router.push(`/playlists${value === "liked" ? "?tab=liked" : ""}`);
  };

  // 현재 경로를 세션 스토리지에 저장
  useEffect(() => {
    sessionStorage.setItem("previousPath", pathname);
  }, [pathname]);

  // 좋아요 상태 변경 시 목록 업데이트
  const handleLikeStatusChange = async () => {
    if (activeTab === "liked") {
      try {
        setIsLoading(true);
        const res = await fetch(
          "http://localhost:8080/api/v1/playlists/liked",
          {
            credentials: "include",
          }
        );
        if (res.ok) {
          const result = await res.json();
          setLikedPlaylists(result.data || []);
        }
      } catch (error) {
        console.error("좋아요한 플레이리스트 업데이트 실패", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 로그인 페이지로 이동
  const handleLoginRedirect = () => {
    // 현재 경로를 저장하여 로그인 후 돌아올 수 있도록 함
    sessionStorage.setItem(
      "loginRedirectPath",
      pathname + (activeTab === "liked" ? "?tab=liked" : "")
    );
    router.push("/auth/login");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">플레이리스트</h1>
        {isLoggedIn ? (
          <Link href="/playlists/new">
            <button className="px-4 py-2 border rounded hover:bg-gray-100">
              새 플레이리스트 생성
            </button>
          </Link>
        ) : (
          <Button onClick={handleLoginRedirect}>
            로그인하여 플레이리스트 만들기
          </Button>
        )}
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="my">내 플레이리스트</TabsTrigger>
          <TabsTrigger value="liked">좋아요한 플레이리스트</TabsTrigger>
        </TabsList>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p>{error}</p>
              {!isLoggedIn && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleLoginRedirect}
                >
                  로그인하기
                </Button>
              )}
            </div>
          </div>
        )}

        <TabsContent value="my">
          {isLoggedIn ? (
            <PlaylistGrid />
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-medium mb-2">로그인이 필요합니다</h3>
              <p className="text-muted-foreground mb-4">
                내 플레이리스트를 보려면 로그인해주세요.
              </p>
              <Button onClick={handleLoginRedirect}>로그인하기</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="liked">
          {isLoggedIn ? (
            <LikedPlaylistGrid
              playlists={likedPlaylists}
              onLikeStatusChange={handleLikeStatusChange}
            />
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-medium mb-2">로그인이 필요합니다</h3>
              <p className="text-muted-foreground mb-4">
                좋아요한 플레이리스트를 보려면 로그인해주세요.
              </p>
              <Button onClick={handleLoginRedirect}>로그인하기</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
