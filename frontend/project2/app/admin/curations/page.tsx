"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Trash2,
  ExternalLink,
  User,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

// 백엔드 API URL
const API_URL = "http://52.78.27.224/api/v1";

// 멤버 타입 정의
interface Member {
  id: number;
  memberId: string;
  username: string;
  email: string;
  profileImage?: string;
  role: "ADMIN" | "MEMBER";
  introduce?: string;
  createdDate: string;
  modifiedDate?: string;
  apiKey?: string;
}

// 큐레이션 타입 정의
interface Curation {
  id: number;
  title: string;
  content: string;
  createdBy?: string;
  createdAt: string;
  modifiedAt: string;
  likeCount: number;
  urls: { url: string }[];
  tags: { name: string }[];
  viewCount?: number;
}

// 큐레이션 요청 파라미터 타입 정의
interface CurationRequestParams {
  tags?: string[];
  title?: string;
  content?: string;
  order?: SortOrder;
}

// 1. SortOrder 타입 수정
type SortOrder = "LATEST" | "LIKECOUNT";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [curations, setCurations] = useState<Curation[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [curationSearchTerm, setCurationSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("members");
  const [error, setError] = useState<string | null>(null);
  // 2. sortOrder 초기값 수정
  const [sortOrder, setSortOrder] = useState<SortOrder>("LATEST");

  useEffect(() => {
    // 관리자 권한 확인
    const checkAdminAndFetchData = async () => {
      try {
        // 세션 스토리지에서 사용자 정보 확인
        const userRole = sessionStorage.getItem("userRole");
        const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";

        if (!isLoggedIn) {
          // ��그인되지 않은 경우 로그인 페이지로 리디렉션
          toast({
            title: "로그인이 필요합니다",
            description: "로그인 페이지로 이동합니다.",
            variant: "destructive",
          });
          router.replace("/auth/login");
          return;
        }

        if (userRole !== "ADMIN") {
          // 관리자가 아닌 경우 홈 페이지로 리디렉션
          toast({
            title: "접근 권한 없음",
            description: "관리자만 접근할 수 있는 페이지입니다.",
            variant: "destructive",
          });
          router.replace("/home");
          return;
        }

        setIsAdmin(true);

        // 세션 스토리지에 캐시된 데이터가 있는지 확인
        const cachedMembers = sessionStorage.getItem("adminMembersData");
        if (cachedMembers) {
          try {
            const parsedMembers = JSON.parse(cachedMembers);
            setMembers(
              parsedMembers.map((member: any) => ({
                id: member.id,
                memberId: member.memberId,
                username: member.username,
                email: member.email,
                profileImage:
                  member.profileImage || "/placeholder.svg?height=40&width=40",
                role: member.role === "ADMIN" ? "ADMIN" : "MEMBER",
                introduce: member.introduce,
                createdDate: member.createdDatetime || new Date().toISOString(),
                modifiedDate: member.modifiedDatetime,
                apiKey: member.apiKey,
              }))
            );
            setIsLoading(false);

            // 백그라운드에서 최신 데이터 가져오기
            fetchMembers(false);
            return;
          } catch (error) {
            console.error("캐시된 데이터 파싱 오류:", error);
            // 캐시 데이터 오류 시 API에서 다시 가져오기
          }
        }

        // 캐시된 데이터가 없으면 API에서 가져오기
        await fetchMembers(true);

        // 큐레이션 데이터는 탭 변경 시 가져오도록 수정
      } catch (error) {
        console.error("권한 확인 오류:", error);
        toast({
          title: "오류 발생",
          description: "페이지 로드 중 오류가 발생했습니다.",
          variant: "destructive",
        });
        router.replace("/home");
      }
    };

    checkAdminAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 멤버 데이터 가져오기 함수
  const fetchMembers = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`${API_URL}/members/members`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "로그인이 필요합니다",
            description: "로그인 페이지로 이동합니다.",
            variant: "destructive",
          });
          router.replace("/auth/login");
          return;
        }
        throw new Error("멤버 데이터를 불러오는데 실패했습니다.");
      }

      const data = await response.json();

      if ((data.code === "200-OK" || data.code === "200-1") && data.data) {
        // API에서 받은 데이터로 멤버 목록 설정
        const formattedMembers = data.data.map((member: any) => {
          // 프로필 이미지 URL 유효성 검사
          let profileImage = member.profileImage;
          if (
            !profileImage ||
            profileImage.trim() === "" ||
            profileImage === "null" ||
            profileImage === "undefined"
          ) {
            profileImage = "/placeholder.svg?height=40&width=40";
          }

          return {
            id: member.id,
            memberId: member.memberId,
            username: member.username,
            email: member.email,
            profileImage: profileImage,
            role: member.role === "ADMIN" ? "ADMIN" : "MEMBER",
            introduce: member.introduce,
            createdDate: member.createdDatetime || new Date().toISOString(),
            modifiedDate: member.modifiedDatetime,
            apiKey: member.apiKey,
          };
        });

        setMembers(formattedMembers);

        // 세션 스토리지에 멤버 데이터 저장
        sessionStorage.setItem("adminMembersData", JSON.stringify(data.data));
      } else {
        throw new Error(data.msg || "멤버 데이터가 없습니다.");
      }
    } catch (error) {
      console.error("멤버 데이터 로드 오류:", error);
      if (showLoading) {
        setError((error as Error).message);
        toast({
          title: "멤버 데이터 로드 실패",
          description: (error as Error).message,
          variant: "destructive",
        });
      }

      // 에러 발생 시 캐시된 데이터가 없으면 빈 배열 설정
      if (members.length === 0) {
        setMembers([]);
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // 3. fetchCurations 함수 수정 - 세션 스토리지 관련 코드 제거 및 API 호출 방식 변경
  const fetchCurations = async (params: CurationRequestParams) => {
    setIsLoading(true);
    setError(null);

    console.log("큐레이션 데이터 조회 시작:", new Date().toISOString());
    console.log("조회 파라미터:", params);

    try {
      // 세션 스토리지 관련 코드 제거

      const queryParams = new URLSearchParams({
        order: params.order || sortOrder,
        ...(params.tags && params.tags.length > 0
          ? { tags: params.tags.join(",") }
          : {}),
        ...(params.title ? { title: params.title } : {}),
        ...(params.content ? { content: params.content } : {}),
      }).toString();

      console.log(
        "큐레이션 API 요청 URL:",
        `${API_URL}/curation?${queryParams}`
      );

      const response = await fetch(`${API_URL}/curation?${queryParams}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("큐레이션 API 응답 상태:", response.status);

      if (!response.ok) {
        throw new Error(
          `큐레이션 데이터 로드 실패: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("큐레이션 API 응답 데이터:", data);

      if (data && data.code === "200-1" && data.data) {
        console.log("큐레이션 데이터 개수:", data.data.length);
        setCurations(data.data);

        // 세션 스토리지 저장 코드 제거
      } else {
        console.error("큐레이션 데이터가 없습니다:", data);
        setCurations([]);
      }
    } catch (error) {
      console.error("큐레이션 데이터 로드 오류:", error);
      setError((error as Error).message);
      setCurations([]);
    } finally {
      console.log("큐레이션 데이터 조회 완료:", new Date().toISOString());
      setIsLoading(false);
    }
  };

  // 멤버 삭제 함수
  const handleDeleteMember = async (id: number, username: string) => {
    if (!confirm(`정말로 멤버 "${username}"을(를) 삭제하시겠습니까?`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/members/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "권한 없음",
            description: "멤버 삭제 권한이 없습니다.",
            variant: "destructive",
          });
          return;
        }
        throw new Error("멤버 삭제에 실패했습니다.");
      }

      // 삭제 성공 시 목록에서 제거
      const updatedMembers = members.filter((member) => member.id !== id);
      setMembers(updatedMembers);

      // 세션 스토리지 업데이트
      const cachedMembers = sessionStorage.getItem("adminMembersData");
      if (cachedMembers) {
        try {
          const parsedMembers = JSON.parse(cachedMembers);
          const updatedCachedMembers = parsedMembers.filter(
            (member: any) => member.id !== id
          );
          sessionStorage.setItem(
            "adminMembersData",
            JSON.stringify(updatedCachedMembers)
          );
        } catch (error) {
          console.error("캐시 업데이트 오류:", error);
        }
      }

      toast({
        title: "삭제 성공",
        description: `멤버 "${username}"이(가) 성공적으로 삭제되었습니다.`,
      });
    } catch (error) {
      console.error("멤버 삭제 오류:", error);
      setError((error as Error).message);
      toast({
        title: "삭제 실패",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 5. 큐레이션 삭제 함수에서 세션 스토리지 업데이트 코드 제거
  const handleDeleteCuration = async (id: number) => {
    if (!confirm(`정말로 큐레이션 #${id}을(를) 삭제하시겠습니까?`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/curations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "권한 없음",
            description: "큐레이션 삭제 권한이 없습니다.",
            variant: "destructive",
          });
          return;
        }
        throw new Error("큐레이션 삭제에 실패했습니다.");
      }

      // 삭제 성공 시 목록에서 제거
      const updatedCurations = curations.filter(
        (curation) => curation.id !== id
      );
      setCurations(updatedCurations);

      // 세션 스토리지 업데이트 코드 제거

      toast({
        title: "삭제 성공",
        description: `큐레이션 #${id}이(가) 성공적으로 삭제되었습니다.`,
      });
    } catch (error) {
      console.error("큐레이션 삭제 오류:", error);
      setError((error as Error).message);
      toast({
        title: "삭제 실패",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 새로고침 함수
  const handleRefresh = async () => {
    await fetchMembers(true);
    await fetchCurations({});
    toast({
      title: "데이터 새로고침",
      description: "최신 데이터를 불러왔습니다.",
    });
  };

  // 4. 정렬 순서 변경 함수 수정
  const handleSortOrderChange = (order: SortOrder) => {
    setSortOrder(order);
    fetchCurations({ order });
  };

  // 큐레이션 검색 함수
  const handleCurationSearch = () => {
    fetchCurations({
      title: curationSearchTerm,
    });
  };

  // 멤버 검색 필터링
  const filteredMembers = members.filter(
    (member) =>
      member.username.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
      member.memberId.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  // 큐레이션 검색 필터링 (클라이언트 측 필터링)
  const filteredCurations = curations.filter(
    (curation) =>
      curation.title.toLowerCase().includes(curationSearchTerm.toLowerCase()) ||
      (curation.createdBy &&
        curation.createdBy
          .toLowerCase()
          .includes(curationSearchTerm.toLowerCase())) ||
      curation.id.toString().includes(curationSearchTerm)
  );

  // 날짜 형식화 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 큐레이션 날짜 형식화 함수
  const formatCurationDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAdmin || isLoading) {
    return (
      <div className="container flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 7. 탭 변경 시 큐레이션 데이터 가져오기
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "curations") {
      fetchCurations({ order: "LATEST" });
    }
  };

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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-2">관리자 대시보드</h1>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            데이터 새로고침
          </Button>
        </div>
        <p className="text-gray-500">멤버와 큐레이션을 관리할 수 있습니다.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start mb-6">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* 8. Tabs 컴포넌트의 onValueChange 속성 수정 */}
      <Tabs
        defaultValue="members"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="members">멤버 관리</TabsTrigger>
          <TabsTrigger value="curations">큐레이션 관리</TabsTrigger>
        </TabsList>

        {/* 멤버 관리 탭 */}
        <TabsContent value="members">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>멤버 검색</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="이름, 아이디 또는 이메일로 검색"
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </CardContent>
          </Card>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>프로필</TableHead>
                  <TableHead>아이디</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>권한</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.id}</TableCell>
                      <TableCell>
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-400" />
                        </div>
                      </TableCell>
                      <TableCell>{member.memberId}</TableCell>
                      <TableCell className="font-medium">
                        {member.username}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === "ADMIN" ? "default" : "secondary"
                          }
                        >
                          {member.role === "ADMIN" ? "관리자" : "일반회원"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(member.createdDate)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDeleteMember(member.id, member.username)
                          }
                          disabled={isDeleting || member.role === "ADMIN"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 큐레이션 관리 탭 */}
        <TabsContent value="curations">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>큐레이션 검색</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="제목, 작성자 또는 ID로 검색"
                    value={curationSearchTerm}
                    onChange={(e) => setCurationSearchTerm(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleCurationSearch()
                    }
                  />
                </div>
                {/* 9. 정렬 버튼 수정 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSortOrderChange("LATEST")}
                  >
                    최신순
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSortOrderChange("LIKECOUNT")}
                  >
                    인기순
                  </Button>
                  <Button onClick={handleCurationSearch}>검색</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>작성일</TableHead>
                  <TableHead className="text-right">조회수</TableHead>
                  <TableHead className="text-right">좋아요</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCurations.length > 0 ? (
                  filteredCurations.map((curation) => (
                    <TableRow key={curation.id}>
                      <TableCell>{curation.id}</TableCell>
                      <TableCell className="font-medium">
                        {curation.title}
                      </TableCell>
                      <TableCell>
                        {curation.createdBy || "알 수 없음"}
                      </TableCell>
                      <TableCell>
                        {formatCurationDate(curation.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {curation.viewCount
                          ? curation.viewCount.toLocaleString()
                          : "0"}
                      </TableCell>
                      <TableCell className="text-right">
                        {curation.likeCount
                          ? curation.likeCount.toLocaleString()
                          : "0"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/curation/${curation.id}`}
                            target="_blank"
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCuration(curation.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
