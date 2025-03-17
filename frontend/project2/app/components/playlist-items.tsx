"use client";

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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { PlaylistItem } from "@/types/playlist";
import {
  deletePlaylistItem,
  updatePlaylistItemOrder,
} from "@/lib/playlist-service";
import AddLinkButton from "./add-link-button";
import { useToast } from "@/components/ui/use-toast";

// 인터페이스에 isOwner 속성 추가
interface PlaylistItemsProps {
  playlistId: number;
  items: PlaylistItem[];
  isOwner?: boolean;
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

  // 새 링크가 추가되었을 때 호출되는 함수
  const handleLinkAdded = (newItem: PlaylistItem) => {
    setItems((prevItems) => [...prevItems, newItem]);
  };

  const handleDelete = async (itemId: number) => {
    if (window.confirm("이 링크를 플레이리스트에서 삭제하시겠습니까?")) {
      try {
        await deletePlaylistItem(playlistId, itemId);
        setItems(items.filter((item) => item.id !== itemId));
        router.refresh();
      } catch (error) {
        console.error("Failed to delete link:", error);
      }
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
        `http://localhost:8080/api/v1/playlists/${playlistId}`,
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

  // 큐레이션 ��룹 토글 함수
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
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() =>
                                        handleDelete(group.header.id)
                                      }
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      삭제하기
                                    </DropdownMenuItem>
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
                                                  <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() =>
                                                      handleDelete(item.id)
                                                    }
                                                  >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    삭제하기
                                                  </DropdownMenuItem>
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
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDelete(item.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    삭제하기
                                  </DropdownMenuItem>
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
    </div>
  );
}
