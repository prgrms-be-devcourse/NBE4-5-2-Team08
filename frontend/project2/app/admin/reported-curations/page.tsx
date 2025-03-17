"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertCircle,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Flag,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

// API URL
const API_URL = "http://52.78.27.224/api/v1";

// 신고 유형 정의
type ReportType = "SPAM" | "INAPPROPRIATE" | "ABUSE" | "FALSE_INFO";

// 신고 유형 카운트 인터페이스
interface ReportTypeCount {
  reportType: ReportType;
  count: number;
}

// 신고된 큐레이션 인터페이스
interface ReportedCuration {
  curationId: number;
  curationTitle: string;
  authorName: string;
  reportTypeCounts: ReportTypeCount[];
}

// 신고 유형 표시 이름
const reportTypeNames: Record<ReportType, string> = {
  SPAM: "스팸",
  INAPPROPRIATE: "부적절한 콘텐츠",
  ABUSE: "욕설/비방",
  FALSE_INFO: "허위 정보",
};

export default function AdminReportedCurationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportedCurations, setReportedCurations] = useState<
    ReportedCuration[]
  >([]);
  const [minReports, setMinReports] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 관리자 권한 확인
    const checkAdminAndFetchData = async () => {
      const userRole = sessionStorage.getItem("userRole");
      if (userRole !== "ADMIN") {
        toast({
          title: "접근 권한 없음",
          description: "관리자만 접근할 수 있는 페이지입니다.",
          variant: "destructive",
        });
        router.push("/home");
        return;
      }

      setIsAdmin(true);
      await fetchReportedCurations();
    };

    checkAdminAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 의존성 배열을 비워서 컴포넌트 마운트 시 한 번만 실행되도록 함

  // 신고된 큐레이션 로드 함수
  const fetchReportedCurations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(
        `신고된 큐레이션 데이터 조회 시작: ${new Date().toISOString()}`
      );
      console.log(
        `API 요청 URL: ${API_URL}/admin/reported-curations-detail?minReports=${minReports}`
      );

      const response = await fetch(
        `${API_URL}/admin/reported-curations-detail?minReports=${minReports}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`API 응답 상태: ${response.status}`);

      if (!response.ok) {
        throw new Error(
          `신고된 큐레이션 데이터를 불러오는데 실패했습니다. (${response.status})`
        );
      }

      const data = await response.json();
      console.log("API 응답 데이터:", data);

      if (data.code === "200-1" && data.data) {
        console.log(`신고된 큐레이션 개수: ${data.data.length}`);
        setReportedCurations(data.data);
      } else {
        console.error("API 응답 형식 오류:", data);
        throw new Error(
          data.msg || "신고된 큐레이션 데이터 형식이 올바르지 않습니다."
        );
      }
    } catch (error) {
      console.error("신고된 큐레이션 로드 오류:", error);
      setError((error as Error).message);
      toast({
        title: "데이터 로드 실패",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      console.log(
        `신고된 큐레이션 데이터 조회 완료: ${new Date().toISOString()}`
      );
      setIsLoading(false);
    }
  };

  // 큐레이션 삭제 함수
  const handleDeleteCuration = async (id: number, title: string) => {
    if (
      !confirm(`정말로 큐레이션 "${title}" (#${id})을(를) 삭제하시겠습니까?`)
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`${API_URL}/admin/curations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`큐레이션 삭제에 실패했습니다. (${response.status})`);
      }

      // 삭제 성공 시 목록에서 제거
      setReportedCurations(
        reportedCurations.filter((curation) => curation.curationId !== id)
      );

      toast({
        title: "삭제 성공",
        description: `큐레이션 "${title}"이(가) 성공적으로 삭제되었습니다.`,
      });
    } catch (error) {
      console.error("큐레이션 삭제 오류:", error);
      toast({
        title: "삭제 실패",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 최소 신고 수 변경 및 새로고침
  const handleMinReportsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setMinReports(value);
    }
  };

  // 특정 신고 유형의 카운트 가져오기
  const getReportTypeCount = (
    curation: ReportedCuration,
    reportType: ReportType
  ): number => {
    const typeCount = curation.reportTypeCounts.find(
      (item) => item.reportType === reportType
    );
    return typeCount ? typeCount.count : 0;
  };

  if (!isAdmin || isLoading) {
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
          href="/admin"
          className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          관리자 대시보드로 돌아가기
        </Link>
        <h1 className="text-3xl font-bold mb-2">신고된 큐레이션</h1>
        <p className="text-gray-500">
          일정 개수 이상 신고된 큐레이션을 확인하고 관리할 수 있습니다.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start mb-6">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>신고 기준 설정</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="minReports" className="text-sm">
              최소 신고 수:
            </label>
            <Input
              id="minReports"
              type="number"
              min="1"
              value={minReports}
              onChange={handleMinReportsChange}
              className="w-20"
            />
          </div>
          <Button onClick={fetchReportedCurations}>적용</Button>
        </CardContent>
      </Card>

      {reportedCurations.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead className="text-center">
                  {reportTypeNames.SPAM}
                </TableHead>
                <TableHead className="text-center">
                  {reportTypeNames.INAPPROPRIATE}
                </TableHead>
                <TableHead className="text-center">
                  {reportTypeNames.ABUSE}
                </TableHead>
                <TableHead className="text-center">
                  {reportTypeNames.FALSE_INFO}
                </TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportedCurations.map((curation) => (
                <TableRow key={curation.curationId}>
                  <TableCell>{curation.curationId}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    <div className="flex items-center">
                      <Flag className="h-4 w-4 mr-2 text-red-500 flex-shrink-0" />
                      <span className="truncate">{curation.curationTitle}</span>
                    </div>
                  </TableCell>
                  <TableCell>{curation.authorName}</TableCell>
                  <TableCell className="text-center">
                    {getReportTypeCount(curation, "SPAM") > 0 && (
                      <Badge variant="outline" className="bg-red-50">
                        {getReportTypeCount(curation, "SPAM")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {getReportTypeCount(curation, "INAPPROPRIATE") > 0 && (
                      <Badge variant="outline" className="bg-red-50">
                        {getReportTypeCount(curation, "INAPPROPRIATE")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {getReportTypeCount(curation, "ABUSE") > 0 && (
                      <Badge variant="outline" className="bg-red-50">
                        {getReportTypeCount(curation, "ABUSE")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {getReportTypeCount(curation, "FALSE_INFO") > 0 && (
                      <Badge variant="outline" className="bg-red-50">
                        {getReportTypeCount(curation, "FALSE_INFO")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/curation/${curation.curationId}`}
                        target="_blank"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleDeleteCuration(
                            curation.curationId,
                            curation.curationTitle
                          )
                        }
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center p-4 bg-yellow-50 rounded-md text-yellow-800">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>현재 신고된 큐레이션이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
