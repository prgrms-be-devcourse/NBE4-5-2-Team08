"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  ExternalLink,
  FileText,
  GripVertical,
  LinkIcon,
  MoreVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Edit,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlaylistItem } from "@/types/playlist";
import {
  deletePlaylistItem,
  updatePlaylistItemOrder,
  updatePlaylistItem,
} from "@/lib/playlist-service";
import AddLinkButton from "./add-link-button";
import { useToast } from "@/components/ui/use-toast";

// 인터페이스에 isOwner 속성 추가
interface PlaylistItemsProps {
  playlistId: number;
  items: PlaylistItem[];
  isOwner?: boolean;
  onItemsChanged?: () => void; // 아이템 변경 시 호출할 콜백 추가
}

// 중첩된 드래그 앤 드롭을 위한 인터페이스 정의
interface DraggableItem {
  id: string; // 드래그 앤 드롭을 위한 고유 ID
  type: "group" | "single"; // 그룹인지 개별 링크인지 구분
  groupKey?: string; // 그룹인 경우 그룹 키
  item: PlaylistItem; // 실제 아이템 데이터
  displayOrder?: number; // 정렬을 위한 표시 순서 (추가)
}

// 큐레이션 그룹 인터페이스 정의
interface CurationGroup {
  header: PlaylistItem;
  links: PlaylistItem[];
}

export default function PlaylistItems({
  playlistId,
  items: initialItems,
  isOwner = false,
  onItemsChanged,
}: PlaylistItemsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<PlaylistItem[]>(initialItems || []);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [curationGroups, setCurationGroups] = useState<
    Record<string, CurationGroup>
  >({});
  const [singleItems, setSingleItems] = useState<PlaylistItem[]>([]);
  const [draggableItems, setDraggableItems] = useState<DraggableItem[]>([]);
  const [isDeleting, setIsDeleting] = useState(false); // 삭제 중 상태 추가

  // 편집 관련 상태 추가
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    url: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 새 링크가 추가되었을 때 호출되는 함수
  const handleLinkAdded = (newItem: PlaylistItem) => {
    setItems((prevItems) => [...prevItems, newItem]);

    // 부모 컴포넌트에 변경 알림 - 한 번만 호출
    if (onItemsChanged) {
      onItemsChanged();
    }
  };

  // handleDelete 함수를 수정하여 새로고침 횟수 최소화
  const handleDelete = async (itemId: number, isGroup = false) => {
    // 이미 삭제 중인 경우 중복 실행 방지
    if (isDeleting) return;

    // 로그인 상태 확인
    if (sessionStorage.getItem("isLoggedIn") !== "true") {
      toast({
        title: "로그인이 필요합니다",
        description: "플레이리스트를 수정하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 큐레이션 그룹인 경우 다른 메시지 표시
    const confirmMessage = isGroup
      ? "이 큐레이션 그룹을 삭제하면 그룹 내 모든 링크도 함께 삭제됩니다. 계속하시겠습니까?"
      : "이 링크를 플레이리스트에서 삭제하시겠습니까?";

    if (window.confirm(confirmMessage)) {
      try {
        setIsDeleting(true); // 삭제 중 상태 설정

        // 삭제 전에 그룹 정보 저장 (UI 업데이트용)
        let groupLinksToRemove: number[] = [];

        if (isGroup) {
          // 삭제할 그룹 헤더 찾기
          const groupHeader = items.find((item) => item.id === itemId);
          if (groupHeader && groupHeader.url) {
            const curationId = groupHeader.url.split("/").pop() || "";
            const groupKey = `curation-${curationId}`;

            // 해당 그룹의 모든 링크 ID 수집
            if (curationGroups[groupKey] && curationGroups[groupKey].links) {
              groupLinksToRemove = curationGroups[groupKey].links.map(
                (link) => link.id
              );
              console.log("삭제할 그룹 링크 IDs:", groupLinksToRemove);
            }
          }
        }

        // 백엔드 API 호출 - deleteChildren 파라미터 명시적으로 전달
        await deletePlaylistItem(playlistId, itemId, true);

        // 로컬 상태 업데이트
        if (isGroup && groupLinksToRemove.length > 0) {
          // 그룹 헤더와 모든 하위 링크 제거
          const updatedItems = items.filter(
            (item) =>
              item.id !== itemId && !groupLinksToRemove.includes(item.id)
          );
          setItems(updatedItems);
        } else {
          // 단일 아이템 삭제 시 기존 로직
          const updatedItems = items.filter((item) => item.id !== itemId);
          setItems(updatedItems);
        }

        // 부모 컴포넌트에 변경 알림 - 한 번만 호출
        if (onItemsChanged) {
          onItemsChanged();
        }

        toast({
          title: isGroup ? "큐레이션 그룹 삭제 완료" : "링크 삭제 완료",
          description: isGroup
            ? "큐레이션 그룹과 하위 링크들이 삭제되었습니다."
            : "링크가 삭제되었습니다.",
        });
      } catch (error) {
        console.error("Failed to delete link:", error);
        toast({
          title: "삭제 실패",
          description: "아이템 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false); // 삭제 중 상태 해제
      }
    }
  };

  // 편집 모달 열기 함수
  const handleEditStart = (item: PlaylistItem) => {
    setEditingItem(item);
    setEditFormData({
      title: item.title || "",
      url: item.url || "",
      description: item.description || "",
    });
    setEditModalOpen(true);
  };

  // 편집 폼 입력 변경 핸들러
  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 편집 저장 함수
  const handleEditSave = async () => {
    if (!editingItem) return;

    // 로그인 상태 확인
    if (sessionStorage.getItem("isLoggedIn") !== "true") {
      toast({
        title: "로그인이 필요합니다",
        description: "플레이리스트를 수정하려면 로그인해주세요.",
        variant: "destructive",
      });
      setEditModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      // 백엔드 API 호출
      await updatePlaylistItem(playlistId, editingItem.id, {
        title: editFormData.title,
        url: editFormData.url,
        description: editFormData.description,
      });

      // 로컬 상태 업데이트
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                title: editFormData.title,
                url: editFormData.url,
                description: editFormData.description,
              }
            : item
        )
      );

      // 성공 메시지
      toast({
        title: "링크 수정 완료",
        description: "링크 정보가 성공적으로 수정되었습니다.",
      });

      // 모달 닫기
      setEditModalOpen(false);
    } catch (error) {
      console.error("링크 수정 오류:", error);
      toast({
        title: "링크 수정 실패",
        description: "링크 정보 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // getHierarchicalOrder 함수를 수정하여 계층 구조를 더 명확하게 처리합니다
  const getHierarchicalOrder = (
    draggables: DraggableItem[],
    groups: Record<string, CurationGroup>
  ): { id: number; children?: number[] }[] => {
    const order: { id: number; children?: number[] }[] = [];

    // 드래그 가능한 아이템의 현재 순서대로 계층 구조 생성
    draggables.forEach((draggable) => {
      if (draggable.type === "group") {
        const groupKey = draggable.groupKey!;
        const group = groups[groupKey];

        // 그룹 헤더와 해당 그룹의 자식 링크 ID 목록
        if (group && group.links && group.links.length > 0) {
          order.push({
            id: draggable.item.id,
            children: group.links.map((link) => link.id),
          });
        } else {
          // 자식이 없는 경우에도 그룹 헤더는 추가
          order.push({ id: draggable.item.id });
        }
      } else {
        // 단일 아이템
        order.push({ id: draggable.item.id });
      }
    });

    return order;
  };

  // handleDragEnd 함수 수정 - 드래그 앤 드롭 후 처리 개선
  const handleDragEnd = async (result: any) => {
    const { source, destination, type } = result;

    // 드롭 위치가 없거나 같은 위치에 드롭한 경우
    if (
      !destination ||
      (source.droppableId === destination.droppableId &&
        source.index === destination.index)
    ) {
      return;
    }

    // 메인 리스트에서의 드래그 앤 드롭 (그룹과 단일 아이템의 순서 변경)
    if (type === "MAIN_LIST") {
      const newDraggableItems = Array.from(draggableItems);
      const [removed] = newDraggableItems.splice(source.index, 1);
      newDraggableItems.splice(destination.index, 0, removed);

      // 먼저 UI 업데이트
      setDraggableItems(newDraggableItems);

      const hierarchicalOrder = getHierarchicalOrder(
        newDraggableItems,
        curationGroups
      );

      try {
        console.log("서버에 전송할 계층 구조:", hierarchicalOrder);
        const updatedPlaylist = await updatePlaylistItemOrder(
          playlistId,
          hierarchicalOrder
        );
        console.log("서버 응답:", updatedPlaylist);

        // 서버 응답을 기반으로 로컬 상태 업데이트
        if (updatedPlaylist && updatedPlaylist.items) {
          // 아이템 목록 업데이트 - 서버에서 받은 순서 그대로 사용
          const sortedItems = [...updatedPlaylist.items].sort(
            (a, b) => a.displayOrder - b.displayOrder
          );
          setItems(sortedItems);

          // 성공 메시지 표시
          toast({
            title: "순서가 변경되었습니다",
            description:
              "플레이리스트 아이템 순서가 성공적으로 변경되었습니다.",
          });

          // 약간의 지연 후 데이터 다시 가져오기 (캐시 문제 방지)
          setTimeout(() => {
            fetchData();
          }, 500); // 지연 시간 원래대로 복원
        }
      } catch (error) {
        console.error("아이템 순서 변경 오류:", error);
        // 오류 발생 시 원래 상태로 복원
        fetchData();

        // 오류 메시지 표시
        toast({
          title: "순서 변경 실패",
          description: "플레이리스트 아이템 순서 변경에 실패했습니다.",
          variant: "destructive",
        });
      }
    }
    // 그룹 내부 링크 목록에서의 드래그 앤 드롭
    else if (type.startsWith("GROUP_")) {
      const groupKey = type.replace("GROUP_", "");
      const group = { ...curationGroups[groupKey] };
      const newLinks = Array.from(group.links);
      const [removed] = newLinks.splice(source.index, 1);
      newLinks.splice(destination.index, 0, removed);

      const newCurationGroups = {
        ...curationGroups,
        [groupKey]: { ...group, links: newLinks },
      };
      setCurationGroups(newCurationGroups);

      // 메인 리스트는 그대로이므로, 업데이트된 그룹 정보를 반영해 전체 계층순서 생성
      const hierarchicalOrder = getHierarchicalOrder(
        draggableItems,
        newCurationGroups
      );

      try {
        console.log(
          "그룹 내 순서 변경 - 서버에 전송할 계층 구조:",
          hierarchicalOrder
        );
        const updatedPlaylist = await updatePlaylistItemOrder(
          playlistId,
          hierarchicalOrder
        );
        console.log("서버 응답:", updatedPlaylist);

        // 서버 응답을 기반으로 로컬 상태 업데이트
        if (updatedPlaylist && updatedPlaylist.items) {
          // 아이템 목록 업데이트 - 서버에서 받은 순서 그대로 사용
          const sortedItems = [...updatedPlaylist.items].sort(
            (a, b) => a.displayOrder - b.displayOrder
          );
          setItems(sortedItems);

          // 약간의 지연 후 데이터 다시 가져오기 (캐시 문제 방지)
          setTimeout(() => {
            fetchData();
          }, 500); // 지연 시간 원래대로 복원
        }
      } catch (error) {
        console.error("그룹 내 링크 순서 변경 오류:", error);
        // 오류 발생 시 원래 상태로 복원
        fetchData();
      }
    }
  };

  // fetchData 함수 수정 - 오류 발생 시 데이터 다시 불러오기
  const fetchData = async () => {
    try {
      // 캐시 헤더를 제거하고 기본 요청으로 단순화
      const response = await fetch(
        `http://52.78.27.224/api/v1/playlists/${playlistId}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: {
            // 캐시 무시 헤더 추가
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("플레이리스트 데이터를 불러오지 못했습니다.");
      }

      const result = await response.json();
      if (result.data && result.data.items) {
        console.log("서버에서 받은 아이템 목록:", result.data.items);

        // 아이템 목록의 displayOrder 값 확인 및 정렬 상태 로깅
        const sortedItems = [...result.data.items].sort(
          (a, b) => a.displayOrder - b.displayOrder
        );
        console.log(
          "서버에서 받은 아이템 displayOrder 정렬 순서:",
          sortedItems.map((item: PlaylistItem) => ({
            id: item.id,
            title: item.title,
            displayOrder: item.displayOrder,
          }))
        );

        // 정렬된 아이템으로 상태 업데이트
        setItems(sortedItems);
      }
    } catch (error) {
      console.error("플레이리스트 데이터 로딩 오류:", error);
    }
  };

  const getLinkTypeIcon = (url: string | undefined) => {
    if (!url) return <LinkIcon className="h-4 w-4" />;
    if (url.includes("pdf")) {
      return <FileText className="h-4 w-4" />;
    }
    if (url.includes("/curation/")) {
      return <BookOpen className="h-4 w-4" />;
    }
    return <LinkIcon className="h-4 w-4" />;
  };

  // 큐레이션 그룹 토글 함수
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // 아이템 분류 및 초기화 – 그룹화 로직 개선
  useEffect(() => {
    // 콘솔에 원본 아이템 출력 (디버깅용)
    console.log("원본 아이템 목록:", items);

    // 먼저 모든 아이템을 displayOrder로 정렬
    const sortedItems = [...items].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );

    const groups: Record<string, CurationGroup> = {};
    const singles: PlaylistItem[] = [];

    // 1. 큐레이션 헤더를 그룹으로 분류 (정렬된 아이템 사용)
    sortedItems.forEach((item) => {
      if (
        item.title?.startsWith("[큐레이션]") &&
        item.url?.includes("/curation/")
      ) {
        const curationId = item.url.split("/").pop() || "unknown";
        const groupKey = `curation-${curationId}`;
        if (!groups[groupKey]) {
          groups[groupKey] = {
            header: item,
            links: [],
          };
        }
      }
    });

    // 2. 나머지 아이템들 중 해당 그룹에 속하는지 판별하여 배정 (정렬된 아이템 사용)
    sortedItems.forEach((item) => {
      // 이미 큐레이션 헤더인 경우 건너뜀
      if (
        item.title?.startsWith("[큐레이션]") &&
        item.url?.includes("/curation/")
      ) {
        return;
      }
      let foundGroup = false;
      for (const [groupKey, group] of Object.entries(groups)) {
        const curationId = group.header.url.split("/").pop() || "";
        if (
          (item.url && item.url.includes(curationId)) ||
          (item.description &&
            (item.description.includes(`[큐레이션ID:${curationId}]`) ||
              item.description.includes(group.header.title))) ||
          Math.abs(item.displayOrder - group.header.displayOrder) <= 10
        ) {
          groups[groupKey].links.push(item);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        singles.push(item);
      }
    });

    // 3. 각 그룹 내의 자식 아이템을 displayOrder 기준으로 정렬
    Object.keys(groups).forEach((key) => {
      groups[key].links.sort((a, b) => a.displayOrder - b.displayOrder);
    });

    setCurationGroups(groups);

    // 4. 기본적으로 모든 그룹을 닫힌 상태로 설정 (true에서 false로 변경)
    const initialExpandedState: Record<string, boolean> = {};
    Object.keys(groups).forEach((groupKey) => {
      initialExpandedState[groupKey] = false; // 기본값을 false로 변경
    });
    setExpandedGroups(initialExpandedState);

    // 5. 드래그 가능한 아이템 목록 생성
    const newDraggableItems: DraggableItem[] = [];

    // 원래 정렬된 아이템 순서를 유지하면서 draggableItems 생성
    sortedItems.forEach((item) => {
      // 큐레이션 헤더인 경우
      if (
        item.title?.startsWith("[큐레이션]") &&
        item.url?.includes("/curation/")
      ) {
        const curationId = item.url.split("/").pop() || "unknown";
        const groupKey = `curation-${curationId}`;

        newDraggableItems.push({
          id: `group-${item.id}`,
          type: "group",
          groupKey,
          item,
          displayOrder: item.displayOrder,
        });
      }
      // 그룹에 속하지 않은 단일 아이템인 경우
      else if (
        !Object.values(groups).some((group) =>
          group.links.some((link) => link.id === item.id)
        )
      ) {
        newDraggableItems.push({
          id: `single-${item.id}`,
          type: "single",
          item,
          displayOrder: item.displayOrder,
        });
      }
      // 그룹에 속한 아이템은 이미 그룹 내에서 처리되므로 여기서는 건너뜀
    });

    // 정렬된 결과 로깅 (디버깅용)
    console.log(
      "정렬된 draggableItems:",
      newDraggableItems.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.item.title,
        displayOrder: item.item.displayOrder,
      }))
    );

    setDraggableItems(newDraggableItems);
  }, [items]);

  // DragDropContext 부분을 수정하여 소유자인 경우에만 드래그 앤 드롭 기능 활성화
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">링크 목록</h2>
        {isOwner && (
          <AddLinkButton
            playlistId={playlistId}
            onLinkAdded={handleLinkAdded}
          />
        )}
      </div>

      {isOwner ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="main-list" type="MAIN_LIST">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {draggableItems.map((draggableItem, index) => {
                  if (draggableItem.type === "group") {
                    const groupKey = draggableItem.groupKey!;
                    const group = curationGroups[groupKey];
                    const isExpanded = expandedGroups[groupKey] || false;

                    return (
                      <Draggable
                        key={draggableItem.id}
                        draggableId={draggableItem.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="mb-4"
                          >
                            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-md border border-blue-200 hover:bg-blue-100 group">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab text-muted-foreground"
                              >
                                <GripVertical className="h-5 w-5" />
                              </div>

                              <button
                                onClick={() => toggleGroup(groupKey)}
                                className="p-1 rounded-full hover:bg-blue-200"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="flex items-center gap-1 bg-white"
                                  >
                                    <BookOpen className="h-4 w-4" />
                                  </Badge>
                                  <h3 className="font-medium line-clamp-1">
                                    {group.header.title}
                                  </h3>
                                  <Badge variant="outline" className="ml-2">
                                    {group.links.length} 링크
                                  </Badge>
                                </div>

                                {group.header.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {group.header.description}
                                  </p>
                                )}

                                <div className="overflow-x-auto">
                                  <a
                                    href={group.header.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-gray-500 underline hover:text-gray-700 flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span className="truncate max-w-[300px]">
                                      큐레이션 보기
                                    </span>
                                  </a>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex"
                                  asChild
                                >
                                  <a
                                    href={group.header.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    방문하기
                                  </a>
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                      <span className="sr-only">메뉴</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={group.header.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        새 탭에서 열기
                                      </a>
                                    </DropdownMenuItem>
                                    {isOwner && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleEditStart(group.header)
                                          }
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          편집하기
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() =>
                                            handleDelete(group.header.id, true)
                                          }
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          삭제하기
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {isExpanded && group.links.length > 0 && (
                              <Droppable
                                droppableId={`group-${groupKey}`}
                                type={`GROUP_${groupKey}`}
                              >
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="pl-8 mt-2 space-y-2"
                                  >
                                    {group.links.map((item, itemIndex) => (
                                      <Draggable
                                        key={`group-item-${item.id}`}
                                        draggableId={`group-item-${item.id}`}
                                        index={itemIndex}
                                      >
                                        {(provided) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="flex items-center gap-3 p-4 bg-card rounded-md border hover:bg-accent/50 group ml-4"
                                          >
                                            <div
                                              {...provided.dragHandleProps}
                                              className="cursor-grab text-muted-foreground"
                                            >
                                              <GripVertical className="h-5 w-5" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <Badge
                                                  variant="outline"
                                                  className="flex items-center gap-1"
                                                >
                                                  {getLinkTypeIcon(item.url)}
                                                </Badge>
                                                <h3 className="font-medium line-clamp-1">
                                                  {item.title}
                                                </h3>
                                              </div>

                                              {item.description && (
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                  {item.description.replace(
                                                    /\s*\[큐레이션ID:\d+\]\s*/g,
                                                    ""
                                                  )}
                                                </p>
                                              )}

                                              <div className="overflow-x-auto">
                                                <a
                                                  href={item.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-sm text-gray-500 underline hover:text-gray-700 flex items-center gap-1"
                                                >
                                                  <ExternalLink className="h-3 w-3" />
                                                  <span className="truncate max-w-[300px]">
                                                    {item.url}
                                                  </span>
                                                </a>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex"
                                                asChild
                                              >
                                                <a
                                                  href={item.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  방문하기
                                                </a>
                                              </Button>

                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                  >
                                                    <MoreVertical className="h-4 w-4" />
                                                    <span className="sr-only">
                                                      메뉴
                                                    </span>
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem asChild>
                                                    <a
                                                      href={item.url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                    >
                                                      새 탭에서 열기
                                                    </a>
                                                  </DropdownMenuItem>
                                                  {isOwner && (
                                                    <>
                                                      <DropdownMenuItem
                                                        onClick={() =>
                                                          handleEditStart(item)
                                                        }
                                                      >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        편집하기
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() =>
                                                          handleDelete(item.id)
                                                        }
                                                      >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        삭제하기
                                                      </DropdownMenuItem>
                                                    </>
                                                  )}
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  } else {
                    // 개별 링크 렌더링
                    const item = draggableItem.item;
                    return (
                      <Draggable
                        key={draggableItem.id}
                        draggableId={draggableItem.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-3 p-4 bg-card rounded-md border hover:bg-accent/50 group"
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab text-muted-foreground"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  {getLinkTypeIcon(item.url)}
                                </Badge>
                                <h3 className="font-medium line-clamp-1">
                                  {item.title}
                                </h3>
                              </div>

                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}

                              <div className="overflow-x-auto">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-gray-500 underline hover:text-gray-700 flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="truncate max-w-[300px]">
                                    {item.url}
                                  </span>
                                </a>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex"
                                asChild
                              >
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  방문하기
                                </a>
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">메뉴</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      새 탭에서 열기
                                    </a>
                                  </DropdownMenuItem>
                                  {isOwner && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleEditStart(item)}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        편집하기
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => handleDelete(item.id)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        삭제하기
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  }
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        // 소유자가 아닌 경우 드래그 앤 드롭 없이 읽기 전용 뷰 제공
        <div className="space-y-2">
          {draggableItems.map((draggableItem) => {
            if (draggableItem.type === "group") {
              const groupKey = draggableItem.groupKey!;
              const group = curationGroups[groupKey];
              const isExpanded = expandedGroups[groupKey] || false;

              return (
                <div key={draggableItem.id} className="mb-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-md border border-blue-200">
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="p-1 rounded-full hover:bg-blue-200"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 bg-white"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Badge>
                        <h3 className="font-medium line-clamp-1">
                          {group.header.title}
                        </h3>
                        <Badge variant="outline" className="ml-2">
                          {group.links.length} 링크
                        </Badge>
                      </div>

                      {group.header.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {group.header.description}
                        </p>
                      )}

                      <div className="overflow-x-auto">
                        <a
                          href={group.header.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-500 underline hover:text-gray-700 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate max-w-[300px]">
                            큐레이션 보기
                          </span>
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex"
                        asChild
                      >
                        <a
                          href={group.header.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          방문하기
                        </a>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">메뉴</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a
                              href={group.header.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              새 탭에서 열기
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {isExpanded && group.links.length > 0 && (
                    <div className="pl-8 mt-2 space-y-2">
                      {group.links.map((item) => (
                        <div
                          key={`group-item-${item.id}`}
                          className="flex items-center gap-3 p-4 bg-card rounded-md border ml-4"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                {getLinkTypeIcon(item.url)}
                              </Badge>
                              <h3 className="font-medium line-clamp-1">
                                {item.title}
                              </h3>
                            </div>

                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {item.description.replace(
                                  /\s*\[큐레이션ID:\d+\]\s*/g,
                                  ""
                                )}
                              </p>
                            )}

                            <div className="overflow-x-auto">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-500 underline hover:text-gray-700 flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span className="truncate max-w-[300px]">
                                  {item.url}
                                </span>
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex"
                              asChild
                            >
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                방문하기
                              </a>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">메뉴</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    새 탭에서 열기
                                  </a>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            } else {
              // 개별 링크 렌더링 (읽기 전용)
              const item = draggableItem.item;
              return (
                <div
                  key={draggableItem.id}
                  className="flex items-center gap-3 p-4 bg-card rounded-md border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        {getLinkTypeIcon(item.url)}
                      </Badge>
                      <h3 className="font-medium line-clamp-1">{item.title}</h3>
                    </div>

                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="overflow-x-auto">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 underline hover:text-gray-700 flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate max-w-[300px]">
                          {item.url}
                        </span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="flex" asChild>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        방문하기
                      </a>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">메뉴</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            새 탭에서 열기
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* 링크 편집 모달 */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>링크 정보 편집</DialogTitle>
            <DialogDescription>
              플레이리스트 링크의 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">제목</Label>
              <Input
                id="edit-title"
                name="title"
                value={editFormData.title}
                onChange={handleEditFormChange}
                placeholder="링크 제목"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                name="url"
                type="url"
                value={editFormData.url}
                onChange={handleEditFormChange}
                placeholder="https://example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">설명</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={editFormData.description}
                onChange={handleEditFormChange}
                placeholder="링크에 대한 설명"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button onClick={handleEditSave} disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : "저장하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
