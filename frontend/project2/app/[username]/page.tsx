"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  MessageSquare,
  Bookmark,
  ArrowLeft,
  UserPlus,
  BookOpen,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import InfiniteScroll from "react-infinite-scroll-component";

// 인터페이스 정의는 이전과 동일
interface CuratorData {
  username: string;
  nickname: string;
  profileImageUrl: string;
  introduction: string;
  followerCount: number;
  followingCount: number;
}

interface Curation {
  curationId: number;
  title: string;
  content: string;
  link: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  bookCount: number;
  hasLike: boolean;
  hasBook: boolean;
  member: {
    username: string;
    nickname: string;
    profileImageUrl: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const ITEMS_PER_PAGE = 10;

export default function CuratorProfile() {
  const params = useParams();
  const router = useRouter();

  // URL 파라미터에서 실제 username 추출
  const username = typeof params?.username === "string" ? params.username : "";

  const [curator, setCurator] = useState<CuratorData | null>(null);
  const [curations, setCurations] = useState<Curation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  // 큐레이터 정보 가져오기
  const fetchCuratorInfo = useCallback(async (username: string) => {
    try {
      setLoading(true);
      console.log("Fetching curator info for:", username);
      console.log("API URL:", `${API_URL}/api/v1/members/${username}`);

      const response = await fetch(`${API_URL}/api/v1/members/${username}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 필요한 경우 여기에 인증 헤더를 추가하세요
        },
      });

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      const responseText = await response.text();
      console.log("Response body:", responseText);

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${responseText}`
        );
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Error parsing JSON:", e);
        throw new Error("Invalid JSON in response");
      }

      console.log("Parsed data:", data);

      if (data.code === "200-4") {
        setCurator(data.data);
      } else {
        throw new Error(data.msg || "큐레이터 데이터가 없습니다.");
      }
    } catch (error) {
      console.error("Error fetching curator info:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 큐레이터의 큐레이션 목록 가져오기 (이전과 동일)
  const fetchCuratorCurations = useCallback(
    async (username: string, page: number) => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/v1/curations/members/${username}?page=${page}&size=${ITEMS_PER_PAGE}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.code === "200-4") {
          if (page === 1) {
            setCurations(data.data.content);
          } else {
            setCurations((prevCurations) => [
              ...prevCurations,
              ...data.data.content,
            ]);
          }
          setHasMore(!data.data.last);
        } else {
          throw new Error(
            data.msg || "큐레이션 목록을 가져오는데 실패했습니다."
          );
        }
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 추가 큐레이션 로드 (이전과 동일)
  const loadMoreCurations = async () => {
    if (username && hasMore) {
      setPage((prevPage) => prevPage + 1);
      fetchCuratorCurations(username, page + 1);
    }
  };

  // 컴포넌트 마운트 시 API 호출
  useEffect(() => {
    if (!username) {
      setError("유효하지 않은 사용자 이름입니다.");
      return;
    }

    console.log("현재 접속한 URL의 username:", username);
    console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);

    // 실제 사용자 데이터 가져오기
    fetchCuratorInfo(username);
    fetchCuratorCurations(username, 1);
  }, [username, fetchCuratorInfo, fetchCuratorCurations]);

  // 날짜 형식화 함수 (이전과 동일)
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <ClipLoader size={50} color="#3498db" />
      </div>
    );
  }

  // 에러 상태 표시 개선
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">오류 발생!</strong>
          <span className="block sm:inline"> {error}</span>
          <div className="mt-2 text-sm">
            <p>API URL: {process.env.NEXT_PUBLIC_API_URL}</p>
            <p>Username: {username}</p>
            <p>현재 URL: {window.location.href}</p>
          </div>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 렌더링 부분은 이전과 동일
  return (
    <div className="container mx-auto mt-8">
      <Link href="/" className="inline-block mb-4">
        <ArrowLeft className="mr-2 inline-block align-middle" /> Back to Home
      </Link>

      {curator && (
        <div className="flex items-center mb-8">
          <Image
            src={curator.profileImageUrl || "/default-profile.png"}
            alt={`${curator.nickname} 프로필`}
            width={80}
            height={80}
            className="rounded-full mr-4"
          />
          <div>
            <h1 className="text-2xl font-bold">{curator.nickname}</h1>
            <p className="text-gray-600">@{curator.username}</p>
            <p className="text-gray-700 mt-2">{curator.introduction}</p>
            <div className="flex mt-2">
              <button className="flex items-center bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2">
                <UserPlus className="mr-2" size={16} /> Follow
              </button>
              <Link
                href={`/curator/${curator.username}/books`}
                className="flex items-center bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                <BookOpen className="mr-2" size={16} /> Books
              </Link>
            </div>
          </div>
        </div>
      )}

      <InfiniteScroll
        dataLength={curations.length}
        next={loadMoreCurations}
        hasMore={hasMore}
        loader={
          <div className="text-center py-4">
            <ClipLoader size={20} color="#3498db" />
          </div>
        }
        endMessage={
          <p className="text-center py-4">
            <b>모든 큐레이션을 불러왔습니다.</b>
          </p>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {curations.map((curation) => (
            <div
              key={curation.curationId}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <Image
                src={curation.imageUrl || "/placeholder.svg"}
                alt={curation.title}
                width={600}
                height={400}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{curation.title}</h2>
                <p className="text-gray-700 mb-2">
                  {curation.content.substring(0, 100)}...
                </p>
                <a
                  href={curation.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline block mb-2"
                >
                  Read More
                </a>
                <div className="flex items-center justify-between text-gray-500">
                  <div className="flex items-center">
                    <Heart className="mr-1" size={16} /> {curation.likeCount}
                    <MessageSquare className="ml-2 mr-1" size={16} />{" "}
                    {curation.commentCount}
                    <Bookmark className="ml-2 mr-1" size={16} />{" "}
                    {curation.bookCount}
                  </div>
                  <span className="text-sm">
                    Posted on: {formatDate(curation.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </InfiniteScroll>
    </div>
  );
}
