"use client";

import type React from "react";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import {
  ChevronDown,
  LogOut,
  User,
  Settings,
  Shield,
  Search,
  Filter,
  Bookmark,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

const API_URL = "http://52.78.27.224";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [userImage, setUserImage] = useState(
    "/placeholder.svg?height=32&width=32"
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // 검색 관련 상태 추가
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("title");
  const [isSearchFilterOpen, setIsSearchFilterOpen] = useState(false);
  const searchFilterRef = useRef<HTMLDivElement | null>(null);

  // 클라이언트 사이드에서만 실행되는 코드를 분리
  const isBrowser = typeof window !== "undefined";
  useEffect(() => {
    console.log("현재 경로:", window.location.href);
    console.log("Next.js 라우팅 확인:", pathname);
  }, [pathname]);
  useEffect(() => {
    if (!isBrowser) return; // 서버 사이드에서는 실행하지 않음

    const checkLoginStatus = async () => {
      try {
        const response = await fetch("http://52.78.27.224/api/v1/members/me", {
          credentials: "include",
        });

        if (response.ok) {
        }
      } catch (error) {
        console.error("로그인 상태 확인 오류:", error);
      }
    };
    checkLoginStatus();
  }, [router, isBrowser]);

  const checkLoginStatus = async () => {
    if (!isBrowser) return; // 서버 사이드에서는 실행하지 않음

    console.log("로그인 상태 확인 중...");

    // 이미 세션에 로그인 정보가 있으면 API 호출 스킵
    const savedLoginStatus = sessionStorage.getItem("isLoggedIn");
    if (savedLoginStatus === "true") {
      setIsLoggedIn(true);
      setUserName(sessionStorage.getItem("userName") || "사용자");
      setMemberId(sessionStorage.getItem("memberId") || "");
      setUserImage(
        sessionStorage.getItem("userImage") ||
          "/placeholder.svg?height=32&width=32"
      );
      setIsAdmin(sessionStorage.getItem("userRole") === "ADMIN");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://52.78.27.224/api/v1/members/me", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("사용자 정보:", data);

        if (data.data) {
          const userRole = data.data.role || "MEMBER";
          setIsLoggedIn(true);
          setUserName(data.data.username || data.data.memberId || "사용자");
          setMemberId(data.data.memberId || "사용자");
          setUserImage(
            data.data.profileImage || "/placeholder.svg?height=32&width=32"
          );
          setIsAdmin(userRole === "ADMIN");

          sessionStorage.setItem("isLoggedIn", "true");
          sessionStorage.setItem("userName", data.data.username || "사용자");
          sessionStorage.setItem("memberId", data.data.memberId || "사용자");
          sessionStorage.setItem(
            "userImage",
            data.data.profileImage || "/placeholder.svg?height=32&width=32"
          );
          sessionStorage.setItem("userId", data.data.id || "");
          sessionStorage.setItem("userRole", userRole);
        } else {
          setIsLoggedIn(false);
          setIsAdmin(false);
          clearSessionData();
        }
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
        clearSessionData();
      }
    } catch (error) {
      console.error("로그인 상태 확인 중 오류:", error);
      setIsLoggedIn(false);
      setIsAdmin(false);
      clearSessionData();
    } finally {
      setIsLoading(false);
    }
  };

  const clearSessionData = () => {
    if (!isBrowser) return; // 서버 사이드에서는 실행하지 않음

    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("memberId");
    sessionStorage.removeItem("userImage");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userRole");
  };

  // 페이지 이동 시마다 로그인 상태 확인
  useEffect(() => {
    if (!isBrowser) return; // 서버 사이드에서는 실행하지 않음

    // 경로가 변경되었을 때만 로그인 상태 확인
    const prevPathname = sessionStorage.getItem("prevPathname");
    if (prevPathname !== pathname) {
      sessionStorage.setItem("prevPathname", pathname);
      checkLoginStatus();
    }
  }, [pathname, isBrowser]);

  // 초기 로그인 상태 확인 및 이벤트 리스너 설정
  useEffect(() => {
    if (!isBrowser) return; // 서버 사이드에서는 실행하지 않음

    console.log("헤더 컴포넌트 마운트 - 로그인 상태 확인 시작");
    const savedLoginStatus = sessionStorage.getItem("isLoggedIn");
    if (savedLoginStatus === "true") {
      setIsLoggedIn(true);
      setUserName(sessionStorage.getItem("userName") || "사용자");
      setMemberId(sessionStorage.getItem("memberId") || "");
      setUserImage(
        sessionStorage.getItem("userImage") ||
          "/placeholder.svg?height=32&width=32"
      );
      setIsAdmin(sessionStorage.getItem("userRole") === "ADMIN");
      setIsLoading(false);
    } else {
      checkLoginStatus();
    }

    const handleLoginEvent = () => {
      console.log("로그인 이벤트 감지됨");
      // 즉시 로그인 상태 업데이트
      const savedLoginStatus = sessionStorage.getItem("isLoggedIn");
      if (savedLoginStatus === "true") {
        setIsLoggedIn(true);
        setUserName(sessionStorage.getItem("userName") || "사용자");
        setMemberId(sessionStorage.getItem("memberId") || "");
        setUserImage(
          sessionStorage.getItem("userImage") ||
            "/placeholder.svg?height=32&width=32"
        );
        setIsAdmin(sessionStorage.getItem("userRole") === "ADMIN");
        setIsLoading(false);
      } else {
        // 세션 스토리지에 정보가 없으면 API 호출
        checkLoginStatus();
      }
    };

    const handleLogoutEvent = () => {
      setIsLoggedIn(false);
      setIsAdmin(false);
      clearSessionData();
      setIsLoading(false);
    };

    window.addEventListener("login", handleLoginEvent);
    window.addEventListener("logout", handleLogoutEvent);

    // 드롭다운 외부 클릭 시 닫기
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }

      if (
        searchFilterRef.current &&
        event.target instanceof Node &&
        !searchFilterRef.current.contains(event.target)
      ) {
        setIsSearchFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("login", handleLoginEvent);
      window.removeEventListener("logout", handleLogoutEvent);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isBrowser]);

  const handleLogout = async () => {
    if (!isBrowser) return; // 서버 사이드에서는 실행하지 않음

    console.log("로그아웃 요청 시작...");
    try {
      const response = await fetch(
        "http://52.78.27.224/api/v1/members/logout",
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setUserName("");
        setMemberId("");
        setUserImage("/placeholder.svg?height=32&width=32");
        document.cookie =
          "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        clearSessionData();
        window.dispatchEvent(new Event("logout"));
        window.location.href = "/home";
      } else {
        console.error("로그아웃 실패");
      }
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
    setIsDropdownOpen(false);
  };

  // 검색 처리 함수
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    // 검색어에서 태그 추출 (#으로 시작하는 단어)
    const tags: string[] = [];
    let title = "";
    let content = "";
    let author = "";

    // 검색어 파싱
    const words = searchQuery.split(" ");
    const nonTagWords: string[] = [];

    words.forEach((word) => {
      if (word.startsWith("#")) {
        // # 제거하고 태그 배열에 추가
        const tag = word.substring(1);
        if (tag) tags.push(tag);
      } else {
        nonTagWords.push(word);
      }
    });

    // 태그가 아닌 단어들은 검색 유형에 따라 처리
    const nonTagText = nonTagWords.join(" ");

    if (searchType === "title") {
      title = nonTagText;
    }

    if (searchType === "content") {
      content = nonTagText;
    }

    if (searchType === "author") {
      author = nonTagText;
    }

    // 검색 이벤트 발생
    const searchEvent = new CustomEvent("search", {
      detail: {
        tags,
        title,
        content,
        author,
        searchType,
        originalQuery: searchQuery,
      },
    });

    window.dispatchEvent(searchEvent);

    // 검색 페이지로 이동 (필요한 경우)
    if (!pathname.includes("/home")) {
      router.push("/home");
    }
  };

  return (
    <header className="border-b">
      <div className="container flex h-14 items-center px-4">
        <div className="flex items-center space-x-4">
          <Link href="/home" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md text-white">
              <Bookmark className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm hidden sm:inline-block">
              Linkurator
            </span>
          </Link>
          <nav className="flex items-center space-x-4 text-sm font-medium">
            <Link
              href="/explore/playlists"
              className="transition-colors hover:text-gray-600"
            >
              플레이리스트 탐색
            </Link>
            <Link
              href="/playlists"
              className="transition-colors hover:text-gray-600"
            >
              내 플레이리스트
            </Link>
            {isLoggedIn && (
              <Link
                href="/following"
                className="transition-colors hover:text-gray-600"
              >
                팔로잉
              </Link>
            )}
          </nav>
        </div>

        {/* 검색바 추가 */}
        <div className="mx-auto max-w-md w-full px-4">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어 입력 (#태그 검색 가능)"
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-24 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="absolute left-3 h-5 w-5 text-gray-400" />

            <div
              className="absolute right-2 flex items-center"
              ref={searchFilterRef}
            >
              <span className="mr-2 text-sm text-gray-500">
                {searchType === "title" && "제목"}
                {searchType === "content" && "내용"}
                {searchType === "author" && "작성자"}
              </span>
              <button
                type="button"
                onClick={() => setIsSearchFilterOpen(!isSearchFilterOpen)}
                className="p-1 rounded-md hover:bg-gray-100 flex items-center"
              >
                <Filter className="h-4 w-4 text-gray-500" />
              </button>

              {isSearchFilterOpen && (
                <div className="absolute right-0 top-8 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      type="button"
                      className={`flex w-full items-center px-4 py-2 text-sm ${
                        searchType === "title"
                          ? "bg-gray-100 text-blue-600"
                          : "text-gray-700"
                      } hover:bg-gray-100`}
                      onClick={() => {
                        setSearchType("title");
                        setIsSearchFilterOpen(false);
                      }}
                    >
                      제목
                    </button>
                    <button
                      type="button"
                      className={`flex w-full items-center px-4 py-2 text-sm ${
                        searchType === "content"
                          ? "bg-gray-100 text-blue-600"
                          : "text-gray-700"
                      } hover:bg-gray-100`}
                      onClick={() => {
                        setSearchType("content");
                        setIsSearchFilterOpen(false);
                      }}
                    >
                      내용
                    </button>
                    <button
                      type="button"
                      className={`flex w-full items-center px-4 py-2 text-sm ${
                        searchType === "author"
                          ? "bg-gray-100 text-blue-600"
                          : "text-gray-700"
                      } hover:bg-gray-100`}
                      onClick={() => {
                        setSearchType("author");
                        setIsSearchFilterOpen(false);
                      }}
                    >
                      작성자
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          {isLoading ? (
            <div className="h-9 w-20 bg-gray-200 rounded-md animate-pulse"></div>
          ) : isLoggedIn ? (
            <>
              <Link
                href="/create-curation"
                className="inline-flex h-9 items-center justify-center rounded-md bg-black px-3 text-sm font-medium text-white shadow hover:bg-gray-800"
              >
                글쓰기
              </Link>
              <div
                className="relative"
                ref={dropdownRef as React.RefObject<HTMLDivElement>}
              >
                <button
                  className="flex items-center space-x-2 rounded-md px-2 py-1 hover:bg-gray-100"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 overflow-hidden">
                    <Image
                      src={userImage || "/placeholder.svg"}
                      alt="Avatar"
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <span className="font-medium">{userName}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div
                      className="py-1"
                      role="menu"
                      aria-orientation="vertical"
                    >
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <User className="mr-2 h-4 w-4" />
                        내정보
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        설정
                      </Link>
                      <Link
                        href="#"
                        className="flex items-center px-4 py-2 text-sm text-blue-700 hover:bg-gray-100"
                        onClick={async () => {
                          setIsDropdownOpen(false); // 드롭다운 닫기

                          try {
                            // ✅ 현재 로그인한 사용자 정보 가져오기
                            const response = await fetch(
                              `${API_URL}/api/v1/members/me`,
                              {
                                method: "GET",
                                credentials: "include", // ✅ 인증 유지
                                headers: {
                                  "Content-Type": "application/json",
                                },
                              }
                            );

                            if (!response.ok) {
                              console.warn("인증 실패 또는 권한 없음");
                              return;
                            }

                            const data = await response.json();

                            // ✅ 서버 응답에서 role 확인
                            const userRole =
                              data?.data?.role ||
                              sessionStorage.getItem("userRole");

                            if (userRole === "ADMIN") {
                              router.push("/admin"); // ✅ 인증된 사용자만 이동
                            } else if (userRole === "MEMBER") {
                              router.push("/dashboard");
                            } else {
                              console.warn("접근 권한이 없습니다.");
                            }
                          } catch (error) {
                            console.error("API 요청 오류:", error);
                          }
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        관리
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        로그아웃
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/login">로그인</Link>
              <Link href="/auth/signup">회원가입</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
