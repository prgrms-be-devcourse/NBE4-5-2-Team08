"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PlaylistForm from "@/app/components/playlist-form";
import type { Playlist } from "@/types/playlist";

export default function EditPlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlaylist() {
      try {
        setIsLoading(true);
        const response = await fetch(
          `http://52.78.27.224/api/v1/playlists/${params.id}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("플레이리스트 데이터를 불러오지 못했습니다.");
        }

        const result = await response.json();
        setPlaylist(result.data);
      } catch (err) {
        console.error("플레이리스트 로딩 오류:", err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchPlaylist();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="container py-6 max-w-2xl mx-auto">
        <div className="mb-4">
          <Link
            href="/playlists"
            className="inline-flex items-center text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            플레이리스트 목록으로 돌아가기
          </Link>
        </div>

        <div className="p-6 bg-red-50 text-red-600 rounded-lg border border-red-200">
          <h2 className="text-xl font-bold mb-2">오류가 발생했습니다</h2>
          <p>{error || "플레이리스트를 찾을 수 없습니다."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-2xl mx-auto">
      <div className="mb-4">
        <Link
          href={`/playlists/${playlist.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          플레이리스트로 돌아가기
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">플레이리스트 편집</h1>
        <p className="text-muted-foreground mt-2">
          플레이리스트 정보를 수정합니다.
        </p>
      </div>

      <PlaylistForm playlist={playlist} />
    </div>
  );
}
