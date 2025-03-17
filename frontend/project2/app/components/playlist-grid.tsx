"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LinkIcon, MoreVertical, Trash2, Edit, Eye } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Playlist } from "@/types/playlist";
import LikeButton from "@/app/components/like-button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

const formatDate = (dateString: string): string => {
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
};

export default function PlaylistGrid() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        setIsLoading(true);
        const res = await fetch("http://52.78.27.224/api/v1/playlists", {
          cache: "no-store",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        if (!res.ok) {
          throw new Error("플레이리스트 데이터를 불러오지 못했습니다.");
        }
        const result = await res.json();
        setPlaylists(result.data);
      } catch (error) {
        console.error("플레이리스트 로딩 실패", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlaylists();
  }, []);

  // handleDelete 함수를 수정하여 삭제 성공 후 플레이리스트 목록 페이지로 리다이렉트합니다
  const handleDelete = async (playlistId: number) => {
    const res = await fetch(
      `http://52.78.27.224/api/v1/playlists/${playlistId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    if (!res.ok) {
      throw new Error("플레이리스트 삭제에 실패했습니다.");
    }

    // 로컬 상태 업데이트
    setPlaylists(playlists.filter((p) => p.id !== playlistId));

    // 플레이리스트 목록 페이지로 리다이렉트
    router.push("/playlists");
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="h-[180px]">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
            <CardFooter className="px-4 py-2">
              <Skeleton className="h-4 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (!playlists.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">플레이리스트가 없습니다.</p>
        <Link href="/playlists/new">
          <Button className="mt-4">새 플레이리스트 생성</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {playlists.map((playlist) => (
        <Card
          key={playlist.id}
          className="relative hover:shadow-md transition-all duration-200 overflow-hidden group border-l-4 border-l-black flex flex-col h-[180px]"
        >
          <Link
            href={`/playlists/${playlist.id}`}
            className="block flex-1 flex flex-col"
          >
            <CardContent className="p-4 pb-2 flex-1 flex flex-col">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-lg truncate pr-6">
                  {playlist.title}
                </h3>
                <div className="absolute top-3 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/playlists/${playlist.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          편집하기
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(playlist.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제하기
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {playlist.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {playlist.description}
                </p>
              )}

              <div className="flex items-center flex-wrap gap-2 mt-auto text-xs text-muted-foreground">
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 font-normal"
                >
                  <Eye className="w-3 h-3" />
                  <span>{playlist.viewCount || 0}</span>
                </Badge>

                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 font-normal"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>{playlist.items?.length || 0} 링크</span>
                </Badge>

                <LikeButton
                  playlistId={playlist.id}
                  initialLikes={playlist.likeCount}
                  size="sm"
                />
              </div>
            </CardContent>

            <CardFooter className="px-4 py-2 bg-muted/10 border-t text-xs text-muted-foreground flex justify-between items-center mt-auto">
              <span className="text-xs opacity-70">
                {playlist.createdAt
                  ? formatDate(playlist.createdAt)
                  : "날짜 정보 없음"}
              </span>
              <span className="text-xs font-medium text-primary/70 hover:text-primary transition-colors">
                자세히 보기
              </span>
            </CardFooter>
          </Link>
        </Card>
      ))}
    </div>
  );
}
