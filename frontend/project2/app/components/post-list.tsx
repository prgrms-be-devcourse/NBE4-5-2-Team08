"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Heart, MessageSquare, Bookmark, Flag } from "lucide-react";
import { stripHtml } from "@/lib/htmlutils";
import { ClipLoader } from "react-spinners"; // 로딩 애니메이션
import ReportModal from "./report-modal";
import ShareButton from "@/app/components/share-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// API URL을 하드코딩된 값에서 환경 변수로 변경합니다.
// 파일 상단에 다음 상수를 추가합니다:
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const PAGE_SIZE = 20; // 한 번에 로드할 아이템 수

// Curation 데이터 인터페이스 정의
interface Curation {
  id: number;
  title: string;
  content: string;
  authorName: string;
  memberImgUrl: string;
  createdAt: string;
  modifiedAt: string;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  urls: {
    url: string;
    title: string;
    description: string;
    imageUrl: string;
    linkId?: number;
    id?: number; // Add this to support both naming conventions
    click?: number; // Add click count
  }[];
  tags: { name: string }[];
}

// 페이지네이션 응답 인터페이스 추가
interface PaginatedResponse {
  curations: Curation[];
  totalPages: number;
  totalElements: number;
  numberOfElements: number;
  size: number;
}

interface CurationRequestParams {
  tags?: string[];
  title?: string;
  content?: string;
  order?: SortOrder;
  page?: number;
  size?: number;
}

type SortOrder = "LATEST" | "LIKECOUNT";

export default function PostList() {
  const [curations, setCurations] = useState<Curation[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("LATEST"); // 기본값: 최신순
  const [loading, setLoading] = useState<boolean>(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false); // 필터 모달 상태
  const [tags, setTags] = useState<string[]>([]); // 선택된 태그 상태
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 필터링된 태그 상태
  const [title, setTitle] = useState<string>(""); // 제목 필터링
  const [content, setContent] = useState<string>(""); // 내용 필터링
  const [likedCurations, setLikedCurations] = useState<{
    [key: number]: boolean;
  }>({}); // 좋아요 상태 관리
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedCurationId, setSelectedCurationId] = useState<number | null>(
    null
  );

  // 페이징을 위한 상태 추가
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // API 요청 함수
  const fetchCurations = async (
    params: CurationRequestParams,
    isLoadMore = false
  ) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const queryParams = new URLSearchParams({
        order: sortOrder,
        page: params.page !== undefined ? params.page.toString() : "0",
        size:
          params.size !== undefined
            ? params.size.toString()
            : PAGE_SIZE.toString(),
        ...(params.tags && params.tags.length > 0
          ? { tags: params.tags.join(",") }
          : {}),
        ...(params.title ? { title: params.title } : {}),
        ...(params.content ? { content: params.content } : {}),
      }).toString();

      console.log(
        `Fetching page ${params.page} with size ${params.size || PAGE_SIZE}`
      );
      const response = await fetch(`${API_URL}/api/v1/curation?${queryParams}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      if (data && data.data) {
        // 새로운 API 응답 구조 처리
        const paginatedData = data.data as PaginatedResponse;
        const newCurations = paginatedData.curations;

        console.log(`Received ${newCurations.length} items`);
        setTotalPages(paginatedData.totalPages);

        // 요청한 사이즈보다 적은 데이터가 왔거나 마지막 페이지인 경우
        setHasMore(page < paginatedData.totalPages - 1);

        if (isLoadMore) {
          // 기존 데이터에 새 데이터 추가
          setCurations((prev) => [...prev, ...newCurations]);
        } else {
          // 새로운 필터링 등의 경우 데이터 교체
          setCurations(newCurations);
        }
      } else {
        console.error("No data found in the response");
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching curations:", error);
      setHasMore(false);
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // 필터 버튼 클릭 시
  const openFilterModal = () => {
    setFilterModalOpen(true);
  };

  const closeFilterModal = () => {
    setFilterModalOpen(false);
  };

  // 더 많은 데이터 로드
  const loadMore = () => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;
    console.log(`Loading more: page ${nextPage}`);
    setPage(nextPage);

    const params: CurationRequestParams = {
      tags: selectedTags,
      title,
      content,
      order: sortOrder,
      page: nextPage,
      size: PAGE_SIZE,
    };

    fetchCurations(params, true);
  };

  // 필터링 조건을 기반으로 API 호출
  const applyFilter = () => {
    setSelectedTags(tags); // 입력한 tags를 selectedTags에 동기화

    // 필터 적용 시 페이지 초기화
    setPage(0);
    setHasMore(true);

    const params: CurationRequestParams = {
      tags: tags, // 여기서는 새로 입력한 tags를 사용
      title,
      content,
      order: sortOrder,
      page: 0,
      size: PAGE_SIZE,
    };

    fetchCurations(params);
    closeFilterModal();
  };

  // 좋아요 토글 함수
  const toggleLike = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/v1/curation/like/${id}`, {
        method: "POST",
        credentials: "include",
      });

      // 상태 업데이트로 UI 갱신
      setCurations((prev) =>
        prev.map((curation) =>
          curation.id === id
            ? {
                ...curation,
                likeCount: likedCurations[id]
                  ? curation.likeCount - 1
                  : curation.likeCount + 1,
              }
            : curation
        )
      );

      // 좋아요 상태 토글
      setLikedCurations((prev) => ({ ...prev, [id]: !prev[id] }));
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  // 링크 클릭 처리 함수
  const handleLinkClick = async (url: string, linkId?: number) => {
    if (!linkId && !url) return;

    // Use either linkId or id property
    const id = linkId;
    if (!id) return;

    try {
      // 링크 클릭 시 백엔드에 조회수 증가 요청
      const response = await fetch(`${API_URL}/api/v1/link/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Link click recorded:", result);
        // 여기서 필요하다면 UI 업데이트 가능
      }
    } catch (error) {
      console.error("링크 클릭 처리 중 오류:", error);
    }

    // 링크 클릭 후 새 탭에서 URL 열기
    window.open(url, "_blank");
  };

  // 신고 모달 열기 함수 추가
  const openReportModal = (id: number) => {
    setSelectedCurationId(id);
    setReportModalOpen(true);
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

  // 태그 필터 변경 시 데이터 다시 로드
  useEffect(() => {
    // 페이지 초기화
    setPage(0);
    setHasMore(true);
    setCurations([]); // 기존 데이터 초기화

    const params: CurationRequestParams = {
      tags: selectedTags,
      title,
      content,
      order: sortOrder,
      page: 0,
      size: PAGE_SIZE,
    };

    fetchCurations(params);
  }, [selectedTags, sortOrder]);

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag); // 이미 선택된 태그가 있으면 제거
      }
      return [...prev, tag]; // 선택되지 않은 태그가 있으면 추가
    });
  };

  // 초기 데이터 로드 및 이벤트 리스너 설정
  useEffect(() => {
    // 페이지 로딩 시 한번 API 호출
    const params: CurationRequestParams = {
      page: 0,
      size: PAGE_SIZE,
    };

    fetchCurations(params);

    // 사이드바에서 태그 선택 이벤트 리스너 추가
    const handleSelectTag = (event: CustomEvent) => {
      const { tag } = event.detail;
      toggleTagFilter(tag);
    };

    window.addEventListener("selectTag", handleSelectTag as EventListener);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener("selectTag", handleSelectTag as EventListener);
    };
  }, []); // 빈 배열을 의존성으로 두어 처음 한 번만 호출되게 설정

  // 좋아요 상태 확인
  useEffect(() => {
    curations.forEach((curation) => {
      checkLikedStatus(curation.id);
    });
  }, [curations]);

  const checkLikedStatus = async (id: number) => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/curation/like/${id}/status`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch like status");

      const data = await response.json();
      setLikedCurations((prev) => ({ ...prev, [id]: data.data })); // 좋아요 여부 설정
    } catch (error) {
      console.error("Error checking like status:", error);
    }
  };

  // 스크롤 이벤트 핸들러 설정
  useEffect(() => {
    // 스크롤 이벤트 핸들러
    const handleScroll = () => {
      if (!loadMoreRef.current || loadingMore || !hasMore) return;

      const rect = loadMoreRef.current.getBoundingClientRect();
      const isVisible = rect.top <= window.innerHeight + 100; // 요소가 화면 하단에서 100px 이내에 있는지 확인

      if (isVisible) {
        console.log("Bottom reached, loading more...");
        loadMore();
      }
    };

    // 스크롤 이벤트 리스너 추가
    window.addEventListener("scroll", handleScroll);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [loadingMore, hasMore, page]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        {/* 필터링 버튼 */}
        <button
          onClick={openFilterModal}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-3 py-1 text-sm font-medium shadow"
        >
          필터링
        </button>
      </div>

      {/* 필터링 모달 */}
      {filterModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-semibold mb-4">필터링 조건</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                태그
              </label>
              <input
                type="text"
                defaultValue={selectedTags.join(", ")}
                onChange={(e) => {
                  // 입력값을 스페이스바가 포함되더라도 정상적으로 처리하도록 수정
                  const inputTags = e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter((tag) => tag !== ""); // 빈 태그는 제외
                  setTags(inputTags); // tags 상태 업데이트
                }}
                className="mt-1 p-2 w-full border rounded-md"
                placeholder="태그 입력 (쉼표로 구분)"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md"
                placeholder="제목 입력"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                내용
              </label>
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md"
                placeholder="내용 입력"
              />
            </div>
            {/* 정렬 기준 드롭다운 추가 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                정렬 기준
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)} // value 변경 시 sortOrder 업데이트
                className="mt-1 p-2 w-full border rounded-md"
              >
                <option value="LATEST">최신순</option>
                <option value="LIKECOUNT">좋아요순</option>
              </select>
            </div>
            <div className="flex justify-between">
              <button
                onClick={applyFilter}
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                적용
              </button>
              <button
                onClick={closeFilterModal}
                className="bg-gray-300 text-black px-4 py-2 rounded-md"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 상태 표시 */}
      {loading && curations.length === 0 ? (
        <div className="flex justify-center items-center py-10">
          <ClipLoader size={50} color="#3498db" />
        </div>
      ) : (
        /* 게시글 목록 */
        <div className="space-y-6 pt-4">
          {curations.length === 0 && !loading ? (
            <p>글이 없습니다.</p>
          ) : (
            <>
              {curations.map((curation) => (
                <div key={curation.id} className="space-y-4 border-b pb-6">
                  {/* 작성자 정보 추가 */}
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={curation.memberImgUrl}
                        alt={curation.authorName}
                      />
                      <AvatarFallback>
                        {curation.authorName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {curation.authorName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(curation.createdAt)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 ml-auto">
                      조회수 {curation.viewCount}
                    </p>
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
                  <div className="flex flex-wrap gap-2 mt-2">
                    {curation.tags.map((tag) => (
                      <span
                        key={tag.name}
                        className={`px-3 py-1 text-sm font-medium rounded-full cursor-pointer ${
                          selectedTags.includes(tag.name)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                        onClick={() => toggleTagFilter(tag.name)}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  {/* 메타 데이터 카드 */}
                  {curation.urls.map((urlObj, index) => (
                    <div
                      key={`${urlObj.url}-${index}`}
                      onClick={() =>
                        handleLinkClick(urlObj.url, urlObj.linkId || urlObj.id)
                      }
                      className="mt-4 rounded-lg border p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            urlObj.imageUrl ||
                            "/placeholder.svg?height=48&width=48" ||
                            "/placeholder.svg" ||
                            "/placeholder.svg"
                          }
                          alt="Preview"
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div>
                          <h3 className="font-medium">
                            {urlObj.title || "링크"}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {urlObj.description || urlObj.url}
                          </p>
                          {urlObj.click !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                              조회수: {urlObj.click}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        className="flex items-center space-x-1 text-sm text-gray-500"
                        onClick={() => toggleLike(curation.id)}
                      >
                        <Heart
                          className={`w-6 h-6 ${
                            likedCurations[curation.id]
                              ? "text-red-500 fill-red-500"
                              : "text-gray-500"
                          }`}
                        />
                        <span>{curation.likeCount}</span>
                      </button>
                      <button className="flex items-center space-x-1 text-sm text-gray-500">
                        <MessageSquare className="h-4 w-4" />
                        <span>{curation.commentCount}</span>
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <button>
                        <Bookmark className="h-4 w-4 text-gray-500" />
                      </button>
                      <ShareButton id={curation.id} variant="icon" />
                      <button onClick={() => openReportModal(curation.id)}>
                        <Flag className="h-4 w-4 text-gray-500 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* 무한 스크롤을 위한 로딩 표시기 */}
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                {loadingMore && <ClipLoader size={30} color="#3498db" />}
                {!hasMore && curations.length > 0 && (
                  <p className="text-gray-500 text-sm">
                    더 이상 글이 없습니다.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {/* 신고 모달 */}
      {selectedCurationId && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          curationId={selectedCurationId}
        />
      )}
    </>
  );
}
