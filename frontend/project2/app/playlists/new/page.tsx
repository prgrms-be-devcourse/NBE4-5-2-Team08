"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PlaylistForm from "@/app/components/playlist-form";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function NewPlaylistPage() {
  const router = useRouter();
  const [returnPath, setReturnPath] = useState<string | null>(null);
  const [curationToAdd, setCurationToAdd] = useState<string | null>(null);

  useEffect(() => {
    // 세션 스토리지에서 돌아갈 경로와 추가할 큐레이션 ID 가져오기
    if (typeof window !== "undefined") {
      const path = sessionStorage.getItem("returnAfterPlaylistCreate");
      const curationId = sessionStorage.getItem("curationToAdd");

      setReturnPath(path);
      setCurationToAdd(curationId);

      // 한 번 사용한 후 세션 스토리지에서 제거
      if (path) sessionStorage.removeItem("returnAfterPlaylistCreate");
      if (curationId) sessionStorage.removeItem("curationToAdd");
    }
  }, []);

  // handlePlaylistCreated 함수를 수정하여 큐레이션의 모든 링크를 추가하도록 변경
  const handlePlaylistCreated = async (playlistId: number) => {
    if (curationToAdd) {
      try {
        // 1. 큐레이션 데이터를 가져옵니다
        const curationResponse = await fetch(
          `http://52.78.27.224/api/v1/curation/${curationToAdd}`,
          {
            credentials: "include",
          }
        );

        if (!curationResponse.ok) {
          throw new Error("큐레이션 정보를 가져오는데 실패했습니다.");
        }

        const curationData = await curationResponse.json();

        // 콘솔에 큐레이션 데이터 구조 출력 (디버깅용)
        console.log("큐레이션 데이터:", curationData.data);

        // urls 배열이 없거나 비어있는 경우 확인
        if (
          !curationData.data.urls ||
          !Array.isArray(curationData.data.urls) ||
          curationData.data.urls.length === 0
        ) {
          toast.warning("이 큐레이션에는 추가할 링크가 없습니다.");
          if (returnPath) {
            router.push(returnPath);
            return;
          }
          router.push(`/playlists/${playlistId}`);
          return;
        }

        const curationUrls = curationData.data.urls;

        // 2. 큐레이션 제목과 설명을 가져옵니다
        const curationTitle = curationData.data.title;
        const curationContent = curationData.data.content;

        // 3. 큐레이션 정보를 플레이리스트에 추가합니다 (그룹 헤더로 사용)
        const headerResponse = await fetch(
          `http://52.78.27.224/api/v1/playlists/${playlistId}/items/link`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              title: `[큐레이션] ${curationTitle}`,
              url: `${window.location.origin}/curation/${curationToAdd}`,
              description: `큐레이션: ${curationTitle} - ${curationContent
                .substring(0, 100)
                .replace(/<[^>]*>/g, "")}...`,
            }),
          }
        );

        if (!headerResponse.ok) {
          throw new Error("큐레이션 헤더 추가에 실패했습니다.");
        }

        // 4. 큐레이션의 각 링크를 플레이리스트에 추가합니다
        let addedCount = 0;

        // 각 URL 항목 처리 전에 로그 출력
        console.log("처리할 URL 항목:", curationUrls);

        for (const urlItem of curationUrls) {
          try {
            // URL 항목 구조 확인
            console.log("현재 URL 항목:", urlItem);

            // URL이 없는 경우 건너뜀
            if (!urlItem.url) {
              console.warn("URL이 없는 항목 건너뜀:", urlItem);
              continue;
            }

            // 각 URL에 대한 메타데이터 가져오기
            const metaResponse = await fetch(
              `http://52.78.27.224/api/v1/link/preview`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ url: urlItem.url }),
              }
            );

            if (!metaResponse.ok) {
              console.warn(
                `메타데이터 가져오기 실패 (${urlItem.url}):`,
                await metaResponse.text()
              );
              continue;
            }

            const metaData = await metaResponse.json();
            console.log("메타데이터:", metaData);

            const linkData = metaData.data || {};

            // 링크 추가
            const addLinkResponse = await fetch(
              `http://52.78.27.224/api/v1/playlists/${playlistId}/items/link`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  title: linkData.title || urlItem.title || "링크",
                  url: urlItem.url,
                  description: linkData.description || "",
                }),
              }
            );

            if (addLinkResponse.ok) {
              addedCount++;
            } else {
              console.warn(
                `링크 추가 실패 (${urlItem.url}):`,
                await addLinkResponse.text()
              );
            }
          } catch (error) {
            console.error(`링크 추가 중 오류 (${urlItem.url}):`, error);
          }
        }

        toast.success(
          `큐레이션의 ${addedCount}개 링크가 플레이리스트에 추가되었습니다.`
        );

        // 원래 페이지로 돌아가기
        if (returnPath) {
          router.push(returnPath);
          return;
        }
      } catch (error) {
        console.error("큐레이션 추가 중 오류:", error);
        toast.error("큐레이션 추가에 실패했습니다.");
      }
    }

    // 새로고침 없이 바로 플레이리스트 상세 페이지로 이동하도록 수정
    // 쿼리 파라미터를 추가하여 캐시 방지
    const timestamp = new Date().getTime();
    router.push(`/playlists/${playlistId}?_t=${timestamp}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-4">
        <Link
          href={returnPath || "/playlists"}
          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {returnPath
            ? "이전 페이지로 돌아가기"
            : "플레이리스트 목록으로 돌아가기"}
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-6">새 플레이리스트 생성</h1>
      <PlaylistForm onPlaylistCreated={handlePlaylistCreated} />
    </div>
  );
}
