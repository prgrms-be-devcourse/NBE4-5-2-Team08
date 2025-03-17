"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Flag,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// API URL
const API_URL = "http://52.78.27.224/api/v1";

// 신고 유형 정의
type ReportType = "SPAM" | "INAPPROPRIATE" | "ABUSE" | "FALSE_INFO";

// 신고 타입 정의
interface Report {
  reportId: number;
  curationId: number;
  curationTitle: string;
  reportType: ReportType;
  reportDate: string;
}

export default function UserReportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 신고 유형 표시 이름
  const reportTypeNames: Record<ReportType, string> = {
    SPAM: "스팸",
    INAPPROPRIATE: "부적절한 콘텐츠",
    ABUSE: "욕설/비방",
    FALSE_INFO: "허위 정보",
  };

  // 신고 데이터 가져오기
  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 세션 스토리지에서 사용자 ID 가져오기
      const memberId = sessionStorage.getItem("userId");

      if (!memberId) {
        throw new Error("사용자 정보를 찾을 수 없습니다.");
      }

      console.log(`신고 데이터 조회 시작: ${new Date().toISOString()}`);

      const response = await fetch(
        `${API_URL}/reports/myreported/${memberId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `신고 데이터 로드 실패: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("신고 API 응답:", data);

      if (data.code === "200-1" && data.data) {
        setReports(data.data);
      } else {
        console.error("신고 데이터가 없습니다:", data);
        setReports([]);
      }
    } catch (err) {
      console.error("신고 데이터 로드 오류:", err);
      setError(
        (err as Error).message || "신고 목록을 불러오는데 실패했습니다."
      );
      setReports([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      console.log(`신고 데이터 조회 완료: ${new Date().toISOString()}`);
    }
  };

  useEffect(() => {
    // 로그인 확인
    const checkAuthAndFetchData = async () => {
      const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";

      if (!isLoggedIn) {
        toast({
          title: "로그인이 필요합니다",
          description: "로그인 페이지로 이동합니다.",
          variant: "destructive",
        });
        router.push("/auth/login");
        return;
      }

      await fetchReports();
    };

    checkAuthAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 새로고침 핸들러
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchReports();
    toast({
      title: "새로고침 완료",
      description: "최신 신고 목록을 불러왔습니다.",
    });
  };

  // 날짜 형식화 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="container flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          대시보드로 돌아가기
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-2">내 신고 관리</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            새로고침
          </Button>
        </div>
        <p className="text-gray-500">
          내가 신고한 콘텐츠를 확인할 수 있습니다.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start mb-6">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {reports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>내 신고 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>큐레이션 ID</TableHead>
                  <TableHead>큐레이션 제목</TableHead>
                  <TableHead>신고 유형</TableHead>
                  <TableHead>신고 일자</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.reportId}>
                    <TableCell>{report.curationId}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Flag className="h-4 w-4 mr-2 text-red-500" />
                        {report.curationTitle}
                      </div>
                    </TableCell>
                    <TableCell>{reportTypeNames[report.reportType]}</TableCell>
                    <TableCell>{formatDate(report.reportDate)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/curation/${report.curationId}`}
                        target="_blank"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center p-4 bg-yellow-50 rounded-md text-yellow-800">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>신고한 콘텐츠가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
