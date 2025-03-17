"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Heart, MessageSquare, Flag, ChevronDown } from "lucide-react";
import { stripHtml } from "@/lib/htmlutils";
import { ClipLoader } from "react-spinners"; // 로딩 애니메이션
import ReportModal from "./report-modal";
import ShareButton from "@/app/components/share-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";

// API URL을 하드코딩된 값에서 환경 변수로 변경합니다.
// 파일 상단에 다음 상수를 추가합니다:
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://52.78.27.224";
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
  author?: string;
  order?: SortOrder;
  page?: number;
  size?: number;
}

interface SearchParams {
  tags: string[];
  title: string;
  content: string;
  author: string;
  searchType: string;
  originalQuery: string;
}

type SortOrder = "LATEST" | "OLDEST" | "LIKECOUNT";

// 디바운스 함수 구현
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function PostList() {
  const [curations, setCurations] = useState<Curation[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("LATEST"); // 기본값: 최신순
  const [loading, setLoading] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]); // 선택된 태그 상태
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 필터링된 태그 상태
  const [title, setTitle] = useState<string>(""); // 제목 필터링
  const [content, setContent] = useState<string>(""); // 내용 필터링
  const [author, setAuthor] = useState<string>(""); // 작성자 필터링
  const [likedCurations, setLikedCurations] = useState<{
    [key: number]: boolean;
  }>({}); // 좋아요 상태 관리
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedCurationId, setSelectedCurationId] = useState<number | null>(
    null
  );
  const [searchActive, setSearchActive] = useState(false); // 검색 활성화 상태
  const [lastSearchQuery, setLastSearchQuery] = useState(""); // 마지막 검색어
  const [showSortOptions, setShowSortOptions] = useState<boolean>(false);

  // 페이징을 위한 상태 추가
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const currentPageRef = useRef<number>(0); // 현재 페이지를 추적하기 위한 ref 추가

  // API 요청 함수
  const fetchCurations = async (
    params: CurationRequestParams,
    isLoadMore = false
  ) => {
    // 이미 로딩 중이면 중복 요청 방지
    if ((isLoadMore && loadingMore) || (!isLoadMore && loading)) {
      console.log("이미 로딩 중입니다. 요청 무시됨.");
      return;
    }

    // 페이지 번호가 현재 페이지와 같으면 중복 요청 방지 (무한 스크롤 시)
    if (
      isLoadMore &&
      params.page !== undefined &&
      params.page <= currentPageRef.current
    ) {
      console.log(`이미 로드된 페이지(${params.page})입니다. 요청 무시됨.`);
      return;
    }

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // URLSearchParams 객체를 생성하고 필수 파라미터 추가
      const queryParams = new URLSearchParams();

      // 필수 파라미터 추가
      queryParams.append("order", params.order || sortOrder);
      queryParams.append(
        "page",
        params.page !== undefined ? params.page.toString() : "0"
      );
      queryParams.append(
        "size",
        params.size !== undefined
          ? params.size.toString()
          : PAGE_SIZE.toString()
      );

      // 조건부 파라미터 추가
      if (params.tags && params.tags.length > 0) {
        queryParams.append("tags", params.tags.join(","));
      }

      if (params.title) {
        queryParams.append("title", params.title);
      }

      if (params.content) {
        queryParams.append("content", params.content);
      }

      if (params.author) {
        queryParams.append("author", params.author);
      }

      const queryString = queryParams.toString();
      console.log(`API 요청 URL: ${API_URL}/api/v1/curation?${queryString}`); // 디버깅을 위한 로그 추가

      const response = await fetch(`${API_URL}/api/v1/curation?${queryString}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      if (data && data.data) {
        // 새로운 API 응답 구조 처리
        const paginatedData = data.data as PaginatedResponse;
        const newCurations = paginatedData.curations;

        console.log(
          `Received ${newCurations.length} items for page ${params.page}`
        );
        setTotalPages(paginatedData.totalPages);

        // 요청한 사이즈보다 적은 데이터가 왔거나 마지막 페이지인 경우
        setHasMore(
          params.page !== undefined
            ? params.page < paginatedData.totalPages - 1
            : false
        );

        if (isLoadMore) {
          // 기존 데이터에 새 데이터 추가
          setCurations((prev) => [...prev, ...newCurations]);
          // 현재 페이지 업데이트
          if (params.page !== undefined) {
            currentPageRef.current = params.page;
          }
        } else {
          // 새로운 필터링 등의 경우 데이터 교체
          setCurations(newCurations);
          // 페이지 초기화
          currentPageRef.current = params.page !== undefined ? params.page : 0;
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

  // 더 많은 데이터 로드
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;

    const params: CurationRequestParams = {
      tags: selectedTags,
      title,
      content,
      author,
      order: sortOrder,
      page: nextPage,
      size: PAGE_SIZE,
    };

    console.log(`Loading more with params:`, JSON.stringify(params, null, 2)); // 디버깅을 위한 로그 추가
    console.log(`Selected tags: ${selectedTags.join(", ")}`); // 태그 확인용 로그

    setPage(nextPage);
    fetchCurations(params, true);
  }, [
    loadingMore,
    hasMore,
    page,
    selectedTags,
    title,
    content,
    sortOrder,
    author,
  ]);

  // 검색 이벤트 처리 함수
  const handleSearchEvent = useCallback(
    (event: Event) => {
      const searchEvent = event as CustomEvent<SearchParams>;
      const searchParams = searchEvent.detail;

      console.log("검색 이벤트 수신:", searchParams);

      // 검색 상태 업데이트
      setSearchActive(true);
      setLastSearchQuery(searchParams.originalQuery);

      // 검색 파라미터 설정
      setSelectedTags(searchParams.tags);
      setTitle(searchParams.title);
      setContent(searchParams.content);
      setAuthor(searchParams.author);

      // 페이지 초기화
      setPage(0);
      setHasMore(true);
      setCurations([]); // 기존 데이터 초기화
      currentPageRef.current = 0; // 현재 페이지 초기화

      // 검색 실행
      const params: CurationRequestParams = {
        tags: searchParams.tags,
        title: searchParams.title,
        content: searchParams.content,
        author: searchParams.author,
        order: sortOrder,
        page: 0,
        size: PAGE_SIZE,
      };

      fetchCurations(params);
    },
    [sortOrder]
  );

  // 검색 초기화 함수
  const resetSearch = () => {
    setSearchActive(false);
    setLastSearchQuery("");
    setSelectedTags([]);
    setTitle("");
    setContent("");
    setAuthor("");

    // 페이지 초기화
    setPage(0);
    setHasMore(true);
    setCurations([]); // 기존 데이터 초기화
    currentPageRef.current = 0; // 현재 페이지 초기화

    // 기본 데이터 로드
    const params: CurationRequestParams = {
      page: 0,
      size: PAGE_SIZE,
    };

    fetchCurations(params);
  };

  // 좋아요 토글 함수
  const toggleLike = async (id: number) => {
    // 로그인 상태 확인
    const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn) {
      // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
      toast({
        title: "로그인이 필요합니다",
        description: "좋아요 기능을 사용하려면 로그인해주세요.",
        variant: "destructive",
      });

      // 현재 URL을 저장하고 로그인 페이지로 이동
      sessionStorage.setItem("loginRedirectPath", window.location.pathname);
      window.location.href = "/auth/login";
      return;
    }

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
    if (searchActive) return; // 검색 중일 때는 자동 로드 방지

    // 페이지 초기화
    setPage(0);
    setHasMore(true);
    setCurations([]); // 기존 데이터 초기화
    currentPageRef.current = 0; // 현재 페이지 초기화

    const params: CurationRequestParams = {
      tags: selectedTags,
      title,
      content,
      author,
      order: sortOrder,
      page: 0,
      size: PAGE_SIZE,
    };

    fetchCurations(params);
  }, [selectedTags, sortOrder, searchActive, title, content, author]);

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

    // 검색 이벤트 리스너 추가
    window.addEventListener("search", handleSearchEvent as EventListener);
    window.addEventListener("selectTag", handleSelectTag as EventListener);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener("search", handleSearchEvent as EventListener);
      window.removeEventListener("selectTag", handleSelectTag as EventListener);
    };
  }, [handleSearchEvent]); // 검색 이벤트 핸들러 의존성 추가

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

  // 디바운스된 스크롤 핸들러 생성
  const debouncedHandleScroll = useCallback(
    debounce(() => {
      if (!loadMoreRef.current || loadingMore || !hasMore) return;

      const rect = loadMoreRef.current.getBoundingClientRect();
      const isVisible = rect.top <= window.innerHeight + 100; // 요소가 화면 하단에서 100px 이내에 있는지 확인

      if (isVisible) {
        console.log("Bottom reached, loading more...");
        loadMore();
      }
    }, 200), // 200ms 디바운스
    [loadMore, loadingMore, hasMore]
  );

  // 스크롤 이벤트 핸들러 설정
  useEffect(() => {
    // 스크롤 이벤트 리스너 추가
    window.addEventListener("scroll", debouncedHandleScroll);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener("scroll", debouncedHandleScroll);
    };
  }, [debouncedHandleScroll]);

  return (
    <>
      {/* 검색 결과 표시 */}
      {searchActive && (
        <div className="flex items-center justify-between mb-4 p-2 bg-gray-100 rounded-md">
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">검색 결과:</span>
            <span className="text-sm text-gray-600">"{lastSearchQuery}"</span>
            {selectedTags.length > 0 && (
              <div className="flex ml-2 gap-1">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={resetSearch}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            검색 초기화
          </button>
        </div>
      )}

      {/* 정렬 옵션 */}
      <div className="flex justify-end mb-4">
        <div className="relative">
          <button
            onClick={() => setShowSortOptions(!showSortOptions)}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium rounded-md border hover:bg-gray-50"
          >
            <span>
              {sortOrder === "LATEST" && "최신순"}
              {sortOrder === "OLDEST" && "오래된순"}
              {sortOrder === "LIKECOUNT" && "좋아요순"}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {showSortOptions && (
            <div className="absolute right-0 mt-1 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1" role="menu">
                <button
                  className={`flex w-full items-center px-4 py-2 text-sm ${
                    sortOrder === "LATEST" ? "text-blue-600" : "text-gray-700"
                  } hover:bg-gray-100`}
                  onClick={() => {
                    setSortOrder("LATEST");
                    setShowSortOptions(false);
                  }}
                >
                  최신순
                </button>
                <button
                  className={`flex w-full items-center px-4 py-2 text-sm ${
                    sortOrder === "OLDEST" ? "text-blue-600" : "text-gray-700"
                  } hover:bg-gray-100`}
                  onClick={() => {
                    setSortOrder("OLDEST");
                    setShowSortOptions(false);
                  }}
                >
                  오래된순
                </button>
                <button
                  className={`flex w-full items-center px-4 py-2 text-sm ${
                    sortOrder === "LIKECOUNT"
                      ? "text-blue-600"
                      : "text-gray-700"
                  } hover:bg-gray-100`}
                  onClick={() => {
                    setSortOrder("LIKECOUNT");
                    setShowSortOptions(false);
                  }}
                >
                  좋아요순
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
                  <div className="flex items-center justify-between">
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
                    </div>
                    <p className="text-xs text-gray-500 flex items-center">
                      <span className="inline-block mr-1">조회수</span>
                      <span className="font-medium">{curation.viewCount}</span>
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
                            "/placeholder.svg?height=48&width=48"
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
                        className={`flex items-center space-x-1 text-sm ${
                          sessionStorage.getItem("isLoggedIn") === "true"
                            ? "text-gray-500 cursor-pointer"
                            : "text-gray-400 cursor-not-allowed"
                        }`}
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
