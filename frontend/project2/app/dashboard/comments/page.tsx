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
  Trash2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// API URL
const API_URL = "http://52.78.27.224/api/v1";

// 댓글 타입 정의
interface Comment {
  id: number;
  authorName: string;
  authorProfileImageUrl: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
  curationId?: number; // 큐레이션 ID는 API에서 제공되지 않을 수 있음
}

export default function UserCommentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 댓글 데이터 가져오기
  const fetchComments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("내 댓글 데이터 조회 시작:", new Date().toISOString());

      const response = await fetch(`${API_URL}/comments/mycomments`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("API 응답 상태:", response.status);

      if (!response.ok) {
        throw new Error(
          `댓글 데이터 로드 실패: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("API 응답 데이터:", data);

      if (data && data.code === "200-1" && data.data) {
        console.log("댓글 데이터 개수:", data.data.length);
        setComments(data.data);
      } else {
        console.error("댓글 데이터가 없습니다:", data);
        setComments([]);
      }
    } catch (err) {
      console.error("댓글 데이터 로드 오류:", err);
      setError(
        (err as Error).message || "댓글 목록을 불러오는데 실패했습니다."
      );
    } finally {
      console.log("댓글 데이터 조회 완료:", new Date().toISOString());
      setIsLoading(false);
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

      await fetchComments();
    };

    checkAuthAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 댓글 삭제 함수
  const handleDeleteComment = async (id: number) => {
    if (!confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`${API_URL}/comments/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("댓글 삭제에 실패했습니다.");
      }

      // 삭제 성공 시 목록에서 제거
      setComments(comments.filter((comment) => comment.id !== id));

      toast({
        title: "삭제 성공",
        description: "댓글이 성공적으로 삭제되었습니다.",
      });
    } catch (err) {
      console.error("댓글 삭제 오류:", err);
      toast({
        title: "삭제 실패",
        description: "댓글을 삭제하는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
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

  // 새로고침 함수
  const handleRefresh = () => {
    fetchComments();
    toast({
      title: "새로고침",
      description: "댓글 목록을 새로고침했습니다.",
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
          <h1 className="text-3xl font-bold mb-2">내 댓글 관리</h1>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
        </div>
        <p className="text-gray-500">
          내가 작성한 댓글을 확인하고 관리할 수 있습니다.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start mb-6">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {comments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>내 댓글 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>내용</TableHead>
                  <TableHead>작성일</TableHead>
                  <TableHead>수정일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell>{comment.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={comment.authorProfileImageUrl}
                            alt={comment.authorName}
                          />
                          <AvatarFallback>
                            {comment.authorName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{comment.authorName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {comment.content}
                    </TableCell>
                    <TableCell>{formatDate(comment.createdAt)}</TableCell>
                    <TableCell>{formatDate(comment.modifiedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {comment.curationId && (
                          <Link
                            href={`/curation/${comment.curationId}`}
                            target="_blank"
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
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
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center p-4 bg-yellow-50 rounded-md text-yellow-800">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>작성한 댓글이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
