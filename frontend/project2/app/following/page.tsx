"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

// 팔로잉 사용자 인터페이스
interface FollowingUser {
  followee: string;
  profileImage: string;
  followedAt: string;
  isFollowing: boolean;
}

export default function FollowingPage() {
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const router = useRouter();

  // 팔로잉 목록 ��져오기
  const fetchFollowingUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://localhost:8080/api/v1/members/following",
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setIsLoggedIn(false);
          return;
        }
        throw new Error("팔로우 중인 사용자 목록을 불러오지 못했습니다.");
      }

      const data = await response.json();
      if (data && data.data && data.data.following) {
        setFollowingUsers(
          data.data.following.map((user: any) => ({
            ...user,
            isFollowing: true,
          }))
        );
        setIsLoggedIn(true);
      } else {
        setFollowingUsers([]);
      }
    } catch (error) {
      console.error("Error fetching following users:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 언팔로우 함수
  const handleUnfollow = async (username: string) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/members/${username}/unfollow`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("언팔로우에 실패했습니다.");
      }

      // 성공적으로 언팔로우한 경우, 해당 사용자의 상태만 변경
      setFollowingUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.followee === username
            ? { ...user, isFollowing: false, followedAt: "" }
            : user
        )
      );
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };

  // 팔로우 함수
  const handleFollow = async (username: string) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/members/${username}/follow`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("팔로우에 실패했습니다.");
      }

      // 현재 날짜를 ISO 문자열로 생성
      const currentDate = new Date().toISOString();

      // 해당 사용자의 상태만 변경
      setFollowingUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.followee === username
            ? { ...user, isFollowing: true, followedAt: currentDate }
            : user
        )
      );
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  // 날짜 형식화 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}년 ${month}월 ${day}일`;
  };

  // 컴포넌트 마운트 시 팔로잉 목록 가져오기
  useEffect(() => {
    fetchFollowingUsers();
  }, []);

  // 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await fetch(
          "http://localhost:8080/api/v1/members/me",
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        setIsLoggedIn(false);
        router.push("/auth/login");
      }
    };

    checkLoginStatus();
  }, [router]);

  if (!isLoggedIn) {
    return null; // 로그인하지 않은 경우 아무것도 표시하지 않음 (리다이렉트 처리됨)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">팔로잉</h1>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="flex animate-pulse items-center rounded-lg border p-4"
            >
              <div className="h-12 w-12 rounded-full bg-gray-200"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 w-24 rounded bg-gray-200"></div>
                <div className="mt-2 h-3 w-32 rounded bg-gray-200"></div>
              </div>
              <div className="h-8 w-20 rounded bg-gray-200"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
          <p>{error}</p>
        </div>
      ) : followingUsers.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-gray-500">아직 팔로우한 큐레이터가 없습니다.</p>
          <Link
            href="/home"
            className="mt-4 inline-block text-blue-500 hover:underline"
          >
            큐레이터 찾아보기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {followingUsers.map((user) => (
            <div
              key={user.followee}
              className="flex items-center rounded-lg border p-4"
            >
              <Link href={`/${user.followee}`} className="flex items-center">
                <div className="h-12 w-12 overflow-hidden rounded-full">
                  <Image
                    src={
                      user.profileImage || "/placeholder.svg?height=48&width=48"
                    }
                    alt={`${user.followee}의 프로필 이미지`}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="ml-4">
                  <h3 className="font-medium text-blue-600 hover:underline">
                    {user.followee}
                  </h3>
                  {user.isFollowing && user.followedAt && (
                    <p className="text-sm text-gray-500">
                      {formatDate(user.followedAt)}부터 팔로우 중
                    </p>
                  )}
                </div>
              </Link>
              <div className="ml-auto">
                {user.isFollowing ? (
                  <button
                    onClick={() => handleUnfollow(user.followee)}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    팔로우중
                  </button>
                ) : (
                  <button
                    onClick={() => handleFollow(user.followee)}
                    className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                  >
                    팔로우
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
