"use client";

import { useState, useEffect } from "react";
import { Plus, FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

interface Playlist {
  id: number;
  title: string;
  description?: string;
}

interface AddToPlaylistModalProps {
  curationId: number;
  isOpen: boolean;
  onClose: () => void;
}

// 추가: LinkMetaData 인터페이스를 정의
interface LinkMetaData {
  title?: string;
  description?: string;
}

/**
 * Helper function: 큐레이션 데이터를 받아서 해당 플레이리스트에 큐레이션 헤더와 각 링크 항목을 추가합니다.
 * 메타데이터 호출 실패 시 fallback으로 기본 정보를 사용합니다.
 * @returns 추가된 링크 개수
 */
async function addCurationToPlaylist(
  playlistId: number,
  curationData: any
): Promise<number> {
  // 큐레이션 데이터에서 필요한 정보 추출
  const {
    id,
    title: curationTitle,
    content: curationContent,
    urls,
  } = curationData.data;

  // 1. 큐레이션 헤더 추가 (그룹 헤더로 사용)
  const headerResponse = await fetch(
    `http://52.78.27.224/api/v1/playlists/${playlistId}/items/link`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: `[큐레이션] ${curationTitle}`,
        url: `${window.location.origin}/curation/${id}`,
        description: `큐레이션: ${curationTitle} - ${curationContent
          .substring(0, 100)
          .replace(/<[^>]*>/g, "")}...`,
      }),
    }
  );
  if (!headerResponse.ok) {
    throw new Error("큐레이션 헤더 추가에 실패했습니다.");
  }

  // 2. 각 링크 항목 추가
  let addedCount = 0;
  console.log("처리할 URL 항목:", urls);
  for (const urlItem of urls) {
    // URL이 없으면 건너뜁니다.
    if (!urlItem.url) {
      console.warn("URL이 없는 항목 건너뜀:", urlItem);
      continue;
    }

    let linkData: LinkMetaData = {};
    try {
      const metaResponse = await fetch(
        `http://52.78.27.224/api/v1/link/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url: urlItem.url }),
        }
      );
      if (metaResponse.ok) {
        const metaJson = await metaResponse.json();
        linkData = metaJson.data || {};
      } else {
        console.warn(
          `메타데이터 가져오기 실패 (${urlItem.url}):`,
          await metaResponse.text()
        );
        // 실패 시 기본값 사용
        linkData = { title: urlItem.title || "링크", description: "" };
      }
    } catch (error) {
      console.error(`메타데이터 가져오기 중 오류 (${urlItem.url}):`, error);
      linkData = { title: urlItem.title || "링크", description: "" };
    }

    const addLinkResponse = await fetch(
      `http://52.78.27.224/api/v1/playlists/${playlistId}/items/link`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: linkData.title || urlItem.title || "링크",
          url: urlItem.url,
          description: (linkData.description || "") + ` [큐레이션ID:${id}]`,
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
  }
  return addedCount;
}

export default function AddToPlaylistModal({
  curationId,
  isOpen,
  onClose,
}: AddToPlaylistModalProps) {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPlaylistForm, setShowNewPlaylistForm] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  // 1. 상태 추가: 이미 추가된 플레이리스트 ID 목록을 저장할 상태 변수 추가
  const [addedToPlaylists, setAddedToPlaylists] = useState<number[]>([]);

  // 플레이리스트 목록 불러오기
  useEffect(() => {
    if (!isOpen) return;

    async function fetchPlaylists() {
      try {
        setLoading(true);
        console.log("플레이리스트 목록 및 추가된 플레이리스트 확인 시작");

        const res = await fetch("http://52.78.27.224/api/v1/playlists", {
          credentials: "include",
        });

        if (!res.ok)
          throw new Error("플레이리스트 목록을 불러오지 못했습니다.");

        const result = await res.json();
        console.log("플레이리스트 목록:", result.data);
        setPlaylists(result.data || []);

        // 이미 큐레이션이 추가된 플레이리스트 확인
        await checkAddedPlaylists();
      } catch (error) {
        console.error("플레이리스트 데이터 로딩 오류:", error);
        toast.error("플레이리스트 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylists();
  }, [isOpen, curationId]);

  // 3. 새로운 함수 추가: 이미 큐레이션이 추가된 플레이리스트 확인
  const checkAddedPlaylists = async () => {
    try {
      console.log(`큐레이션 ID ${curationId}에 대한 플레이리스트 확인 시작`);

      // 큐레이션이 이미 추가된 플레이리스트 목록 가져오기
      const response = await fetch(
        `http://52.78.27.224/api/v1/curation/${curationId}/playlists`,
        {
          credentials: "include",
        }
      );

      console.log("API 응답 상태:", response.status, response.statusText);

      if (!response.ok) {
        console.warn(
          "큐레이션이 추가된 플레이리스트 확인 실패:",
          response.status
        );
        return;
      }

      const data = await response.json();
      console.log("API 응답 데이터:", data);

      if (data.data && Array.isArray(data.data)) {
        // 이미 추가된 플레이리스트 ID 목록 설정
        const addedIds = data.data.map((playlist: any) => playlist.id);
        console.log("추가된 플레이리스트 ID 목록:", addedIds);
        setAddedToPlaylists(addedIds);
      } else {
        console.warn("API 응답에 예상된 데이터 형식이 없음:", data);
      }
    } catch (error) {
      console.error("큐레이션이 추가된 플레이리스트 확인 중 오류:", error);
    }
  };

  // 기존 플레이리스트에 큐레이션 추가 함수
  const handleAddCuration = async () => {
    if (!selectedPlaylistId) return;

    try {
      setIsSubmitting(true);

      // 1. 큐레이션 데이터를 가져옵니다.
      const curationResponse = await fetch(
        `http://52.78.27.224/api/v1/curation/${curationId}`,
        {
          credentials: "include",
        }
      );
      if (!curationResponse.ok) {
        throw new Error("큐레이션 정보를 가져오는데 실패했습니다.");
      }
      const curationData = await curationResponse.json();
      console.log("큐레이션 데이터:", curationData.data);

      // urls 배열이 없거나 비어있으면 경고 후 종료
      if (
        !curationData.data.urls ||
        !Array.isArray(curationData.data.urls) ||
        curationData.data.urls.length === 0
      ) {
        toast.warning("이 큐레이션에는 추가할 링크가 없습니다.");
        onClose();
        return;
      }

      // 2. 큐레이션을 플레이리스트에 추가
      const addedCount = await addCurationToPlaylist(
        selectedPlaylistId,
        curationData
      );
      toast.success(
        `큐레이션의 ${addedCount}개 링크가 플레이리스트에 추가되었습니다.`
      );
      if (addedCount > 0) {
        router.push(`/playlists/${selectedPlaylistId}`);
      }
      onClose();
    } catch (error) {
      console.error("큐레이션 추가 중 오류:", error);
      toast.error("큐레이션 추가 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 새 플레이리스트를 생성하고 큐레이션을 추가하는 함수
  const handleCreateAndAddToPlaylist = async () => {
    if (!newPlaylistTitle.trim()) {
      toast.error("플레이리스트 제목을 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. 새 플레이리스트 생성
      const createRes = await fetch("http://52.78.27.224/api/v1/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newPlaylistTitle,
          description: newPlaylistDescription,
          isPublic: true,
        }),
      });
      if (!createRes.ok) throw new Error("플레이리스트 생성에 실패했습니다.");
      const newPlaylist = await createRes.json();
      const newPlaylistId = newPlaylist.data.id;

      // 2. 큐레이션 데이터를 가져옵니다.
      const curationResponse = await fetch(
        `http://52.78.27.224/api/v1/curation/${curationId}`,
        {
          credentials: "include",
        }
      );
      if (!curationResponse.ok) {
        throw new Error("큐레이션 정보를 가져오는데 실패했습니다.");
      }
      const curationData = await curationResponse.json();
      console.log("큐레이션 데이터:", curationData.data);
      if (
        !curationData.data.urls ||
        !Array.isArray(curationData.data.urls) ||
        curationData.data.urls.length === 0
      ) {
        toast.warning("이 큐레이션에는 추가할 링크가 없습니다.");
        router.push(`/playlists/${newPlaylistId}`);
        onClose();
        return;
      }

      // 3. 큐레이션을 새 플레이리스트에 추가
      const addedCount = await addCurationToPlaylist(
        newPlaylistId,
        curationData
      );
      toast.success(
        `새 플레이리스트가 생성되고 큐레이션의 ${addedCount}개 링크가 추가되었습니다.`
      );
      router.push(`/playlists/${newPlaylistId}`);
      onClose();
    } catch (error) {
      console.error("플레이리스트 생성 중 오류:", error);
      toast.error("플레이리스트 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 플레이리스트 생성 페이지로 이동 (세션 스토리지에 현재 URL 저장)
  const goToCreatePlaylist = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "returnAfterPlaylistCreate",
        window.location.pathname
      );
      sessionStorage.setItem("curationToAdd", curationId.toString());
    }
    router.push("/playlists/new");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>플레이리스트에 추가</DialogTitle>
          <DialogDescription>
            이 큐레이션을 추가할 플레이리스트를 선택하거나 새로 만드세요.
          </DialogDescription>
        </DialogHeader>

        {showNewPlaylistForm ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">플레이리스트 제목</Label>
              <Input
                id="title"
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                placeholder="제목을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택사항)</Label>
              <Input
                id="description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="플레이리스트에 대한 설명을 입력하세요"
              />
            </div>
          </div>
        ) : (
          <div className="py-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  아직 플레이리스트가 없습니다.
                </p>
                <Button onClick={() => setShowNewPlaylistForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />새 플레이리스트 만들기
                </Button>
              </div>
            ) : (
              <>
                <RadioGroup
                  value={selectedPlaylistId?.toString()}
                  onValueChange={(value) =>
                    setSelectedPlaylistId(Number(value))
                  }
                >
                  <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2">
                    {playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className={`flex items-center space-x-2 rounded-md border p-3 hover:bg-accent transition-colors ${
                          addedToPlaylists.includes(playlist.id)
                            ? "border-green-500 bg-green-50/80"
                            : ""
                        }`}
                      >
                        <RadioGroupItem
                          value={playlist.id.toString()}
                          id={`playlist-${playlist.id}`}
                        />
                        <Label
                          htmlFor={`playlist-${playlist.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center">
                            <span className="font-medium">
                              {playlist.title}
                            </span>
                            {addedToPlaylists.includes(playlist.id) && (
                              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
                                추가됨
                              </span>
                            )}
                          </div>
                          {playlist.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {playlist.description}
                            </div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewPlaylistForm(true)}
                  >
                    <FolderPlus className="mr-2 h-4 w-4" />새 플레이리스트
                    만들기
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          {showNewPlaylistForm ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowNewPlaylistForm(false)}
                disabled={isSubmitting}
              >
                뒤로
              </Button>
              <Button
                onClick={handleCreateAndAddToPlaylist}
                disabled={isSubmitting || !newPlaylistTitle.trim()}
              >
                {isSubmitting ? "처리 중..." : "생성 및 추가"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                onClick={handleAddCuration}
                disabled={
                  isSubmitting ||
                  selectedPlaylistId === null ||
                  playlists.length === 0
                }
              >
                {isSubmitting ? "추가 중..." : "추가"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
