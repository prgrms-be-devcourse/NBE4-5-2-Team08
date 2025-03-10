"use client"

import type React from "react"

import { useParams } from "next/navigation"; // useParams import 추가
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { X, Plus, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

// 큐레이션 수정 요청 인터페이스
interface CurationRequest {
  title: string
  content: string
  linkReqDtos: { url: string }[]
  tagReqDtos: { name: string }[]
}

// 큐레이션 데이터 인터페이스
interface CurationData {
  title: string
  content: string
  urls: { url: string }[]
  tags: { name: string }[]
}

export default function EditPostPage() {
  const { id } = useParams(); // useParams 훅으로 id 가져오기
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [links, setLinks] = useState<string[]>([""])
  const [tags, setTags] = useState<string[]>([""])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 큐레이션 데이터 불러오기
  useEffect(() => {
    async function fetchCurationData() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`http://localhost:8080/api/v1/curation/${id}`)

        if (!response.ok) {
          throw new Error("큐레이션 데이터를 불러오는 데 실패했습니다.")
        }

        const data = await response.json()

        if (data.code === "200-1") {
          const curation: CurationData = data.data

          // 데이터 설정
          setTitle(curation.title)
          setContent(curation.content)

          // 링크 설정 (빈 배열이면 빈 입력 필드 하나 추가)
          const urlList = curation.urls?.map((item) => item.url) || []
          setLinks(urlList.length > 0 ? urlList : [""])

          // 태그 설정 (빈 배열이면 빈 입력 필드 하나 추가)
          const tagList = curation.tags?.map((item) => item.name) || []
          setTags(tagList.length > 0 ? tagList : [""])
        } else {
          throw new Error(data.msg || "큐레이션 데이터를 불러오는 데 실패했습니다.")
        }
      } catch (err) {
        console.error("큐레이션 데이터 불러오기 오류:", err)
        setError((err as Error).message)
        toast.error((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurationData()
  }, [id])

  // 링크 입력 필드 추가
  const addLinkField = () => {
    setLinks([...links, ""])
  }

  // 링크 입력 필드 제거
  const removeLinkField = (index: number) => {
    const newLinks = [...links]
    newLinks.splice(index, 1)
    setLinks(newLinks)
  }

  // 링크 값 변경
  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links]
    newLinks[index] = value
    setLinks(newLinks)
  }

  // 태그 입력 필드 추가
  const addTagField = () => {
    setTags([...tags, ""])
  }

  // 태그 입력 필드 제거
  const removeTagField = (index: number) => {
    const newTags = [...tags]
    newTags.splice(index, 1)
    setTags(newTags)
  }

  // 태그 값 변경
  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags]
    newTags[index] = value
    setTags(newTags)
  }

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검사
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.")
      return
    }

    if (!content.trim()) {
      toast.error("내용을 입력해주세요.")
      return
    }

    // 빈 링크 필터링
    const filteredLinks = links.filter((link) => link.trim() !== "")

    // 빈 태그 필터링
    const filteredTags = tags.filter((tag) => tag.trim() !== "")

    try {
      setIsSubmitting(true)

      // API 요청 데이터 구성
      const requestData: CurationRequest = {
        title,
        content,
        linkReqDtos: filteredLinks.map((url) => ({ url })),
        tagReqDtos: filteredTags.map((name) => ({ name })),
      }

      // API 호출
      const response = await fetch(`http://localhost:8080/api/v1/curation/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })
      
      if (!response.ok) {
        throw new Error("큐레이션 수정에 실패했습니다.")
      }

      const data = await response.json()

      if (data.code === "200-1") {
        toast.success("큐레이션이 성공적으로 수정되었습니다.")
        // 수정된 큐레이션 상세 페이지로 이동
        router.push(`/curation/${id}`)
      } else {
        throw new Error(data.msg || "큐레이션 수정에 실패했습니다.")
      }
    } catch (error) {
      console.error("큐레이션 수정 중 오류 발생:", error)
      toast.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // 오류 상태 표시
  if (error) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">
          <h2 className="text-xl font-bold mb-2">오류가 발생했습니다</h2>
          <p>⚠️ {error}</p>
          <Link href="/" className="mt-4 inline-flex items-center text-sm text-gray-500 hover:text-black">
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/curation/${id}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-black"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          큐레이션으로 돌아가기
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">큐레이션 수정</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 제목 입력 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="제목을 입력하세요"
            required
          />
        </div>

        {/* 내용 입력 */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-1">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="내용을 입력하세요"
            rows={8}
            required
          />
        </div>

        {/* 링크 입력 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">링크</label>
            <button type="button" onClick={addLinkField} className="text-blue-600 text-sm flex items-center">
              <Plus className="h-4 w-4 mr-1" /> 링크 추가
            </button>
          </div>
          <div className="space-y-2">
            {links.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => handleLinkChange(index, e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
                <button
                  type="button"
                  onClick={() => removeLinkField(index)}
                  className="p-2 text-gray-400 hover:text-red-500"
                  aria-label="링크 삭제"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 태그 입력 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">태그</label>
            <button type="button" onClick={addTagField} className="text-blue-600 text-sm flex items-center">
              <Plus className="h-4 w-4 mr-1" /> 태그 추가
            </button>
          </div>
          <div className="space-y-2">
            {tags.map((tag, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => handleTagChange(index, e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="태그 입력 (예: 개발, AI, 생산성)"
                />
                <button
                  type="button"
                  onClick={() => removeTagField(index)}
                  className="p-2 text-gray-400 hover:text-red-500"
                  aria-label="태그 삭제"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-3">
          <Link
            href={`/curation/${id}`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            취소
          </Link>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </form>
    </div>
  )
}

