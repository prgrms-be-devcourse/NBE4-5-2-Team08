"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  BookOpen,
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import RightSidebar from "@/app/components/right-sidebar";

// 큐레이터 데이터 타입 정의
interface CuratorData {
  username: string;
  profileImage: string;
  introduce: string;
  curationCount: number;
}

// 큐레이션 데이터 타입 정의
interface Curation {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  likeCount: number;
  tags: { name: string }[];
  urls: { url: string }[];
}

// Link 메타 데이터 인터페이스 정의
interface LinkMetaData {
  url: string;
  title: string;
  description: string;
  image: string;
}

export default function CuratorProfile() {
  const params = useParams();
  const router = useRouter();
  const [curator, setCurator] = useState<CuratorData | null>(null);
  const [curations, setCurations] = useState<Curation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkMetaDataList, setLinkMetaDataList] = useState<{
    [key: number]: LinkMetaData[];
  }>({});

  useEffect(() => {
    async function fetchCuratorData() {
      if (!params.username) return;
      setLoading(true);
      setError(null);
      try {
        // 유저 정보 가져오기
        const curatorRes = await axios.get(
          `http://localhost:8080/api/v1/members/${params.username}`
        );
        setCurator(curatorRes.data.data);

        // 큐레이션 목록 가져오기
        const curationsRes = await axios.get(
          `http://localhost:8080/api/v1/curation?author=${params.username}`
        );
        setCurations(curationsRes.data.data);
      } catch (err) {
        setError("데이터를 불러올 수 없습니다.");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCuratorData();
  }, [params.username]);

  useEffect(() => {
    curations.forEach((curation) => {
      if (curation.urls && curation.urls.length > 0) {
        curation.urls.forEach((urlObj) => {
          if (
            !linkMetaDataList[curation.id]?.some(
              (meta) => meta.url === urlObj.url
            )
          ) {
            fetchLinkMetaData(urlObj.url, curation.id);
          }
        });
      }
    });
  }, [curations, linkMetaDataList]);

  // 메타 데이터 추출 함수
  const fetchLinkMetaData = async (url: string, curationId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/link/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: url }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch link metadata");
      }

      const data = await response.json();
      setLinkMetaDataList((prev) => {
        const existingMetaData = prev[curationId] || [];
        const newMetaData = existingMetaData.filter(
          (meta) => meta.url !== data.data.url
        );
        return {
          ...prev,
          [curationId]: [...newMetaData, data.data],
        };
      });
    } catch (error) {
      console.error("Error fetching link metadata:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <ClipLoader size={50} color="#3498db" />
      </div>
    );
  }

  if (error || !curator) {
    return (
      <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50 flex items-center justify-center min-h-[40vh]">
        <h2 className="text-xl font-bold">오류 발생</h2>
        <p>{error || "유저 정보를 찾을 수 없습니다."}</p>
      </div>
    );
  }

  return (
    <main className="container grid grid-cols-12 gap-6 px-4 py-6">
      <div className="col-span-12 lg:col-span-9">
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-500 hover:text-black"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> 뒤로가기
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex flex-col items-center">
            <Image
              src={curator.profileImage || "/default-profile.png"}
              alt={`${curator.username} 프로필`}
              width={120}
              height={120}
              className="rounded-full"
            />
            <h1 className="mt-4 text-2xl font-bold">{curator.username}</h1>
            <p className="text-gray-600 mt-2 text-center">
              {curator.introduce || "소개 정보 없음"}
            </p>
          </div>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-3">
        <RightSidebar />
      </div>
    </main>
  );
}
