"use client";

import type React from "react";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Edit, Trash2, X, Check } from "lucide-react";
import CommentSkeleton from "./skeleton/comment-skeleton";
import Link from "next/link";

// 댓글 데이터 타입 정의를 API 응답 구조에 맞게 수정
type Comment = {
  id?: number;
  commentId?: number; // API 응답에서는 commentId로 제공됨
  authorId?: number | null; // null도 허용하도록 수정
  authorName: string;
  authorImgUrl?: string;
  authorProfileImageUrl?: string; // 새로 추가된 필드
  content: string;
  createdAt: string;
  modifiedAt: string;
  isLiked?: boolean;
  replies?: Reply[]; // 답글 배열 추가
};

// 답글 타입 정의 추가
type Reply = {
  id: number;
  authorId?: number | null; // null도 허용하도록 수정
  authorName: string;
  authorProfileImageUrl?: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
};

// API에서 받은 데이터 타입
type CurationData = {
  title: string;
  content: string;
  comments: Comment[];
};

// 댓글 섹션 컴포넌트 props 타입 정의
interface CommentSectionProps {
  postId: string;
}

// 댓글 섹션 컴포넌트
export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]); // 댓글 상태
  const [newComment, setNewComment] = useState(""); // 새 댓글 상태
  const [isSubmitting, setIsSubmitting] = useState(false); // 제출 중 상태
  const [error, setError] = useState<string | null>(null); // 오류 상태
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null); // 수정 중인 댓글 ID
  const [editContent, setEditContent] = useState(""); // 수정 중인 댓글 내용
  const [loading, setLoading] = useState(true); // 로딩 상태 추가
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(
    null
  ); // 답글 작성 중인 댓글 ID
  const [newReply, setNewReply] = useState(""); // 새 답글 내용
  const [editingReplyInfo, setEditingReplyInfo] = useState<{
    commentId: number;
    replyId: number;
  } | null>(null); // 수정 중인 답글 정보
  const [editReplyContent, setEditReplyContent] = useState(""); // 수정 중인 답글 내용
  // Add a login state at the beginning of the component
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null); // 현재 로그인한 사용자 ID 추가

  // API에서 커레이션 데이터를 불러오는 함수 수정
  const fetchCurationData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`http://52.78.27.224/api/v1/curation/${id}`);

      if (!res.ok) {
        throw new Error("댓글 데이터를 불러오는 데 실패했습니다.");
      }

      const data = await res.json();
      if (data.code === "200-1" || data.code === "200-OK") {
        // API 응답에서 commentId를 사용하므로 이를 처리
        const commentsWithId =
          data.data.comments?.map((comment: any) => ({
            ...comment,
            id: comment.commentId, // id 필드를 추가하여 일관성 유지
            // 프로필 이미지 URL 처리 - authorProfileImageUrl이 있으면 사용, 없으면 authorImgUrl 사용
            authorImgUrl:
              comment.authorProfileImageUrl ||
              comment.authorImgUrl ||
              "/placeholder.svg?height=36&width=36",
          })) || [];
        setComments(commentsWithId);
      } else {
        throw new Error(data.msg || "댓글 데이터를 불러오는 데 실패했습니다.");
      }
    } catch (error) {
      console.error("API 호출 중 오류 발생:", error);
      setError((error as Error).message);
    } finally {
      // 스켈레톤 UI가 잠시 보이도록 약간의 지연 추가 (실제 환경에서는 제거 가능)
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  // 컴포넌트 마운트 시 API 호출
  useEffect(() => {
    fetchCurationData(postId); // 주어진 postId로 커레이션 데이터를 가져옵니다.
  }, [postId]);

  // Add this useEffect after the other useEffect hooks to check login status
  useEffect(() => {
    // Check if user is logged in by checking if userId exists in sessionStorage
    const userId = sessionStorage.getItem("userId");
    setIsLoggedIn(!!userId);

    // 현재 로그인한 사용자 ID 설정
    if (userId) {
      setCurrentUserId(Number.parseInt(userId, 10));
    } else {
      setCurrentUserId(null);
    }
  }, []);

  // 댓글 좋아요 기능 (미구현)
  const handleLikeComment = (commentId: string) => {
    setComments(
      comments.map((comment, index) => {
        if (commentId === index.toString()) {
          return {
            ...comment,
            isLiked: !comment.isLiked,
          };
        }
        return comment;
      })
    );
  };

  // 새 댓글 작성 기능 - API 연결
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // API 호출로 댓글 생성
      const response = await fetch(
        `http://52.78.27.224/api/v1/curations/${postId}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: newComment,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("댓글 작성에 실패했습니다.");
      }

      const result = await response.json();

      if (result.code === "200-2") {
        // API 응답으로 받은 새 댓글 데이터
        const newCommentData: Comment = {
          id: result.data.id,
          commentId: result.data.id,
          authorId: currentUserId, // 현재 사용자 ID 추가 (null일 수도 있음)
          authorName: result.data.authorName,
          content: result.data.content,
          createdAt: result.data.createdAt,
          modifiedAt: result.data.modifiedAt,
          isLiked: false,
          // 새로운 API 응답에서 프로필 이미지 URL 사용
          authorImgUrl:
            result.data.authorProfileImageUrl ||
            "/placeholder.svg?height=36&width=36",
        };

        // 댓글 목록 업데이트
        setComments([newCommentData, ...comments]);
        setNewComment(""); // 입력 필드 초기화
      } else {
        throw new Error(result.msg || "댓글 작성에 실패했습니다.");
      }
    } catch (error) {
      console.error("댓글 작성 중 오류 발생:", error);
      setError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 수정 시작
  const handleEditStart = (comment: Comment) => {
    if (comment.id) {
      setEditingCommentId(comment.id);
      setEditContent(comment.content);
    }
  };

  // 댓글 수정 취소
  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  // 댓글 수정 저장 함수 수정
  const handleEditSave = async (commentId: number) => {
    if (!commentId) {
      console.error("댓글 ID가 없습니다");
      return;
    }

    if (!editContent.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // API 호출로 댓글 수정
      const response = await fetch(
        `http://52.78.27.224/api/v1/curations/${postId}/comments/${commentId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: editContent,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("댓글 수정에 실패했습니다.");
      }

      const result = await response.json();

      if (result.code === "200-2") {
        // 댓글 목록 업데이트
        setComments(
          comments.map((comment) => {
            if (comment.id === commentId || comment.commentId === commentId) {
              return {
                ...comment,
                content: editContent,
                modifiedAt: result.data.modifiedAt || new Date().toISOString(),
              };
            }
            return comment;
          })
        );

        // 수정 모드 종료
        setEditingCommentId(null);
        setEditContent("");
      } else {
        throw new Error(result.msg || "댓글 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("댓글 수정 중 오류 발생:", error);
      setError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 삭제 함수 수정
  const handleDeleteComment = async (commentId: number) => {
    if (!commentId) {
      console.error("댓글 ID가 없습니다");
      return;
    }

    if (!confirm("정말로 이 댓글을 삭제하시겠습니까?")) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // API 호출로 댓글 삭제
      const response = await fetch(
        `http://52.78.27.224/api/v1/curations/${postId}/comments/${commentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("댓글 삭제에 실패했습니다.");
      }

      const result = await response.json();

      if (result.code === "200-1") {
        // 댓글 목록에서 삭제된 댓글 제거
        setComments(
          comments.filter(
            (comment) =>
              comment.id !== commentId && comment.commentId !== commentId
          )
        );
      } else {
        throw new Error(result.msg || "댓글 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("댓글 삭제 중 오류 발생:", error);
      setError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 날짜 형식화 함수
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "유효하지 않은 날짜";
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
    } catch (error) {
      console.error("Date formatting error:", error);
      return "날짜 형식 오류";
    }
  };

  // 답글 작성 취소 함수 추가
  const handleCancelReply = () => {
    setReplyingToCommentId(null);
    setNewReply("");
  };

  // 답글 작성 함수 추가
  const handleAddReply = async (commentId: number) => {
    if (!newReply.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // API 호출로 답글 생성
      const response = await fetch(
        `http://52.78.27.224/api/v1/curations/${postId}/comments/${commentId}/reply`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: newReply,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("답글 작성에 실패했습니다.");
      }

      const result = await response.json();

      if (result.code === "200-2") {
        // API 응답으로 받은 새 답글 데이터
        const newReplyData: Reply = {
          id: result.data.id,
          authorId: currentUserId, // 현재 사용자 ID 추가
          authorName: result.data.authorName,
          authorProfileImageUrl: result.data.authorProfileImageUrl,
          content: result.data.content,
          createdAt: result.data.createdAt,
          modifiedAt: result.data.modifiedAt,
        };

        // 댓글 목록 업데이트 - 해당 댓글에 답글 추가
        setComments(
          comments.map((comment) => {
            if (comment.commentId === commentId || comment.id === commentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newReplyData],
              };
            }
            return comment;
          })
        );

        // 입력 필드 초기화 및 답글 작성 모드 종료
        setNewReply("");
        setReplyingToCommentId(null);
      } else {
        throw new Error(result.msg || "답글 작성에 실패했습니다.");
      }
    } catch (error) {
      console.error("답글 작성 중 오류 발생:", error);
      setError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 답글 수정 시작 함수 추가
  const handleEditReplyStart = (commentId: number, reply: Reply) => {
    setEditingReplyInfo({ commentId, replyId: reply.id });
    setEditReplyContent(reply.content);
  };

  // 답글 수정 취소 함수 추가
  const handleEditReplyCancel = () => {
    setEditingReplyInfo(null);
    setEditReplyContent("");
  };

  // 답글 수정 저장 함수 추가
  const handleEditReplySave = async (commentId: number, replyId: number) => {
    if (!editReplyContent.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // API 호출로 답글 수정
      const response = await fetch(
        `http://52.78.27.224/api/v1/curations/${postId}/comments/${commentId}/reply/${replyId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: editReplyContent,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("답글 수정에 실패했습니다.");
      }

      const result = await response.json();

      if (result.code === "200-2") {
        // 댓글 목록 업데이트 - 해당 댓글의 답글 수정
        setComments(
          comments.map((comment) => {
            if (comment.commentId === commentId || comment.id === commentId) {
              return {
                ...comment,
                replies: (comment.replies || []).map((reply) => {
                  if (reply.id === replyId) {
                    return {
                      ...reply,
                      content: editReplyContent,
                      modifiedAt: result.data.modifiedAt,
                    };
                  }
                  return reply;
                }),
              };
            }
            return comment;
          })
        );

        // 수정 모드 종료
        setEditingReplyInfo(null);
        setEditReplyContent("");
      } else {
        throw new Error(result.msg || "답글 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("답글 수정 중 오류 발생:", error);
      setError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 답글 삭제 함수 추가
  const handleDeleteReply = async (commentId: number, replyId: number) => {
    if (!confirm("정말로 이 답글을 삭제하시겠습니까?")) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // API 호출로 답글 삭제
      const response = await fetch(
        `http://52.78.27.224/api/v1/curations/${postId}/comments/${commentId}/reply/${replyId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("답글 삭제에 실패했습니다.");
      }

      const result = await response.json();

      if (result.code === "200-1") {
        // 댓글 목록 업데이트 - 해당 댓글에서 답글 제거
        setComments(
          comments.map((comment) => {
            if (comment.commentId === commentId || comment.id === commentId) {
              return {
                ...comment,
                replies: (comment.replies || []).filter(
                  (reply) => reply.id !== replyId
                ),
              };
            }
            return comment;
          })
        );
      } else {
        throw new Error(result.msg || "답글 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("답글 삭제 중 오류 발생:", error);
      setError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 사용자가 댓글 작성자인지 확인하는 함수
  const isCommentAuthor = (authorId?: number | null) => {
    return (
      currentUserId !== null &&
      authorId !== undefined &&
      authorId !== null &&
      currentUserId === authorId
    );
  };

  // 로딩 중일 때 스켈레톤 UI 표시
  if (loading) {
    return <CommentSkeleton />;
  }

  // Modify the return statement at the end of the component to conditionally render based on login status
  // Replace the entire return statement with this:
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">댓글 {comments.length}개</h2>

      {isLoggedIn ? (
        // Original content for logged-in users
        <>
          <form onSubmit={handleAddComment} className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 작성해주세요..."
              className="w-full rounded-md border p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              disabled={isSubmitting}
            />

            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? "작성 중..." : "댓글 작성"}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {comments.length > 0 ? (
              comments.map((comment, index) => (
                <div
                  key={comment.commentId || comment.id || index}
                  className="rounded-lg border p-4"
                >
                  <div className="flex justify-between">
                    <div className="flex items-center space-x-2">
                      <Image
                        src={
                          comment.authorImgUrl ||
                          "/placeholder.svg?height=36&width=36" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg"
                        }
                        alt={comment.authorName}
                        width={36}
                        height={36}
                        className="rounded-full"
                      />
                      <div>
                        <p className="font-medium">{comment.authorName}</p>
                        <p className="text-xs text-gray-500">
                          {comment.createdAt &&
                          comment.modifiedAt &&
                          Math.floor(
                            new Date(comment.modifiedAt).getTime() / 1000
                          ) !==
                            Math.floor(
                              new Date(comment.createdAt).getTime() / 1000
                            )
                            ? `수정된 날짜: ${formatDate(comment.modifiedAt)}`
                            : `작성된 날짜: ${formatDate(comment.createdAt)}`}
                        </p>
                      </div>
                    </div>

                    {/* 댓글 액션 버튼 - 작성자만 볼 수 있도록 수정 */}
                    {isCommentAuthor(comment.authorId) && (
                      <div className="flex space-x-1">
                        {comment.id !== editingCommentId &&
                        comment.commentId !== editingCommentId ? (
                          <>
                            <button
                              onClick={() => handleEditStart(comment)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteComment(
                                  comment.commentId || comment.id || 0
                                )
                              }
                              className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                handleEditSave(
                                  comment.commentId || comment.id || 0
                                )
                              }
                              className="p-1 text-green-500 hover:text-green-600 rounded-full hover:bg-gray-100"
                              disabled={isSubmitting}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="p-1 text-red-500 hover:text-red-600 rounded-full hover:bg-gray-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {comment.id !== editingCommentId &&
                  comment.commentId !== editingCommentId ? (
                    <p className="mt-2 text-sm">{comment.content}</p>
                  ) : (
                    <div className="mt-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full rounded-md border p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={2}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  <div className="mt-3 flex items-center space-x-4">
                    <button
                      className="text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        setReplyingToCommentId(
                          comment.commentId || comment.id || 0
                        );
                        setNewReply("");
                      }}
                    >
                      답글
                    </button>
                  </div>

                  {/* 답글 목록 */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-3 pl-6 border-l-2 border-gray-100">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="relative">
                          <div className="flex justify-between">
                            <div className="flex items-center space-x-2">
                              <Image
                                src={
                                  reply.authorProfileImageUrl ||
                                  "/placeholder.svg?height=28&width=28" ||
                                  "/placeholder.svg" ||
                                  "/placeholder.svg" ||
                                  "/placeholder.svg" ||
                                  "/placeholder.svg"
                                }
                                alt={reply.authorName}
                                width={28}
                                height={28}
                                className="rounded-full"
                              />
                              <div>
                                <p className="font-medium text-sm">
                                  {reply.authorName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {reply.createdAt &&
                                  reply.modifiedAt &&
                                  Math.floor(
                                    new Date(reply.modifiedAt).getTime() / 1000
                                  ) !==
                                    Math.floor(
                                      new Date(reply.createdAt).getTime() / 1000
                                    )
                                    ? `수정된 날짜: ${formatDate(
                                        reply.modifiedAt
                                      )}`
                                    : `작성된 날짜: ${formatDate(
                                        reply.createdAt
                                      )}`}
                                </p>
                              </div>
                            </div>

                            {/* 답글 액션 버튼 - 작성자만 볼 수 있도록 수정 */}
                            {isCommentAuthor(reply.authorId) && (
                              <div className="flex space-x-1">
                                {!editingReplyInfo ||
                                editingReplyInfo.commentId !==
                                  (comment.commentId || comment.id || 0) ||
                                editingReplyInfo.replyId !== reply.id ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleEditReplyStart(
                                          comment.commentId || comment.id || 0,
                                          reply
                                        )
                                      }
                                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteReply(
                                          comment.commentId || comment.id || 0,
                                          reply.id
                                        )
                                      }
                                      className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleEditReplySave(
                                          comment.commentId || comment.id || 0,
                                          reply.id
                                        )
                                      }
                                      className="p-1 text-green-500 hover:text-green-600 rounded-full hover:bg-gray-100"
                                      disabled={isSubmitting}
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={handleEditReplyCancel}
                                      className="p-1 text-red-500 hover:text-red-600 rounded-full hover:bg-gray-100"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {!editingReplyInfo ||
                          editingReplyInfo.commentId !==
                            (comment.commentId || comment.id || 0) ||
                          editingReplyInfo.replyId !== reply.id ? (
                            <p className="mt-1 text-sm">{reply.content}</p>
                          ) : (
                            <div className="mt-1">
                              <textarea
                                value={editReplyContent}
                                onChange={(e) =>
                                  setEditReplyContent(e.target.value)
                                }
                                className="w-full rounded-md border p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                rows={2}
                                disabled={isSubmitting}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 답글 작성 폼 */}
                  {replyingToCommentId ===
                    (comment.commentId || comment.id) && (
                    <div className="mt-3 pl-6 border-l-2 border-gray-100">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddReply(comment.commentId || comment.id || 0);
                        }}
                        className="space-y-2"
                      >
                        <textarea
                          value={newReply}
                          onChange={(e) => setNewReply(e.target.value)}
                          placeholder="답글을 작성해주세요..."
                          className="w-full rounded-md border p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          rows={2}
                          disabled={isSubmitting}
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={handleCancelReply}
                            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 border rounded-md"
                          >
                            취소
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            disabled={!newReply.trim() || isSubmitting}
                          >
                            {isSubmitting ? "작성 중..." : "답글 작성"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
              </div>
            )}
          </div>
        </>
      ) : (
        // Content for non-logged-in users - blurred comments with login prompt
        <div className="relative">
          {/* Blurred comments background */}
          <div className="filter blur-sm opacity-50 pointer-events-none">
            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.slice(0, 3).map((comment, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-9 h-9 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                        <div className="h-3 w-24 bg-gray-100 rounded mt-1"></div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="h-4 w-full bg-gray-200 rounded"></div>
                      <div className="h-4 w-3/4 bg-gray-200 rounded mt-1"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                아직 댓글이 없습니다.
              </div>
            )}
          </div>

          {/* Login prompt overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 rounded-lg border-2 border-blue-100">
            <div className="text-center p-6 max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                댓글을 보려면 로그인이 필요합니다
              </h3>
              <p className="text-gray-600 mb-6">
                로그인하시면 댓글을 읽고 작성할 수 있습니다. 다른 사용자들의
                의견을 확인해보세요!
              </p>
              <Link href="/auth/login">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
                  로그인하기
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
