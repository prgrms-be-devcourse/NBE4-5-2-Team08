"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Save, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

interface UserProfile {
    id: number
    memberId: string
    username: string
    email: string
    profileImage: string
    introduce: string
}

export default function ProfilePage() {
    const router = useRouter()
    const { toast } = useToast()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        profileImage: "",
        introduce: "",
    })

    // 사용자 프로필 정보 가져오기
    useEffect(() => {
        // 이미 세션에 사용자 정보가 있는지 확인
        const savedLoginStatus = sessionStorage.getItem("isLoggedIn")
        const savedUserName = sessionStorage.getItem("userName")

        // 이미 로그인 정보가 있으면 API 호출 스킵
        if (savedLoginStatus === "true" && savedUserName) {
            setIsLoading(false)
            setProfile({
                id: Number(sessionStorage.getItem("userId") || "0"),
                memberId: savedUserName,
                username: sessionStorage.getItem("userName") || "",
                email: sessionStorage.getItem("userEmail") || "",
                profileImage: sessionStorage.getItem("userImage") || "",
                introduce: sessionStorage.getItem("userIntroduce") || "",
            })
            setFormData({
                username: sessionStorage.getItem("userName") || "",
                email: sessionStorage.getItem("userEmail") || "",
                profileImage: sessionStorage.getItem("userImage") || "",
                introduce: sessionStorage.getItem("userIntroduce") || "",
            })
            return
        }

        const fetchUserProfile = async () => {
            setIsLoading(true)
            try {
                const response = await fetch("http://localhost:8080/api/v1/members/me", {
                    credentials: "include",
                    // 캐시 제어 추가
                    cache: "no-store",
                    headers: {
                        "Cache-Control": "no-cache",
                    },
                })

                if (!response.ok) {
                    if (response.status === 401) {
                        toast({
                            title: "로그인이 필요합니다",
                            description: "프로필을 보려면 로그인해주세요.",
                            variant: "destructive",
                        })
                        router.push("/auth/login")
                        return
                    }
                    throw new Error("프로필 정보를 불러오는데 실패했습니다.")
                }

                const data = await response.json()

                if (data.data) {
                    setProfile(data.data)
                    setFormData({
                        username: data.data.username || "",
                        email: data.data.email || "",
                        profileImage: data.data.profileImage || "",
                        introduce: data.data.introduce || "",
                    })

                    // 세션 스토리지에 사용자 정보 저장
                    sessionStorage.setItem("userName", data.data.username || "")
                    sessionStorage.setItem("userEmail", data.data.email || "")
                    sessionStorage.setItem("userImage", data.data.profileImage || "")
                    sessionStorage.setItem("userIntroduce", data.data.introduce || "")
                    sessionStorage.setItem("userId", data.data.id?.toString() || "0")
                    sessionStorage.setItem("isLoggedIn", "true")
                } else {
                    throw new Error("프로필 데이터가 없습니다.")
                }
            } catch (error) {
                console.error("프로필 정보 로딩 오류:", error)
                setError((error as Error).message)
                toast({
                    title: "오류 발생",
                    description: (error as Error).message,
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchUserProfile()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    // 프로필 업데이트 함수 수정
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        try {
            // profile이 null이면 업데이트할 수 없음
            if (!profile || !profile.memberId) {
                throw new Error("프로필 정보를 찾을 수 없습니다.")
            }

            // memberId를 URL에 포함하여 API 호출
            const response = await fetch(`http://localhost:8080/api/v1/members/${profile.memberId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    memberId: profile.memberId,
                    username: formData.username,
                    password: formData.password || undefined, // 비밀번호가 빈 문자열이면 undefined로 설정
                    email: formData.email,
                    profileImage: formData.profileImage || undefined,
                    introduce: formData.introduce,
                }),
            })

            if (!response.ok) {
                throw new Error("프로필 업데이트에 실패했습니다.")
            }

            toast({
                title: "프로필 업데이트 성공",
                description: "프로필 정보가 성공적으로 업데이트되었습니다.",
            })

            // 세션 스토리지 업데이트
            sessionStorage.setItem("userName", formData.username)
            sessionStorage.setItem("userEmail", formData.email)
            sessionStorage.setItem("userImage", formData.profileImage)
            sessionStorage.setItem("userIntroduce", formData.introduce)

            // 헤더 업데이트를 위한 이벤트 발생
            window.dispatchEvent(new Event("login"))
        } catch (error) {
            console.error("프로필 업데이트 오류:", error)
            setError((error as Error).message)
            toast({
                title: "업데이트 실패",
                description: (error as Error).message,
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteAccount = async () => {
        try {
            setIsSubmitting(true)

            // 계정 삭제 API 호출
            const response = await fetch(`http://localhost:8080/api/v1/members/delete`, {
                method: "DELETE",
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error("계정 삭제에 실패했습니다.")
            }

            toast({
                title: "계정 삭제 완료",
                description: "계정이 성공적으로 삭제되었습니다.",
            })

            // 세션 스토리지 초기화
            sessionStorage.removeItem("isLoggedIn")
            sessionStorage.removeItem("userName")
            sessionStorage.removeItem("userImage")
            sessionStorage.removeItem("userId")

            // 로그아웃 이벤트 발생
            window.dispatchEvent(new Event("logout"))

            // 홈으로 리다이렉트
            router.push("/home")
        } catch (error) {
            console.error("계정 삭제 오류:", error)
            toast({
                title: "계정 삭제 실패",
                description: (error as Error).message,
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
            setShowDeleteConfirm(false)
        }
    }

    if (isLoading) {
        return (
            <div className="container max-w-2xl mx-auto py-10 px-4">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="container max-w-2xl mx-auto py-10 px-4">
            <div className="mb-6">
                <Link href="/home" className="inline-flex items-center text-sm text-gray-500 hover:text-black">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    홈으로 돌아가기
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">내 프로필</CardTitle>
                    <CardDescription>프로필 정보를 확인하고 수정할 수 있습니다.</CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {/* 현재 프로필 이미지 표시 */}
                        <div className="flex justify-center mb-4">
                            <div className="relative h-24 w-24">
                                <Image
                                    src={formData.profileImage || "/placeholder.svg?height=96&width=96"}
                                    alt="Profile"
                                    width={96}
                                    height={96}
                                    className="rounded-full object-cover"
                                />
                            </div>
                        </div>

                        {/* 에러 메시지 */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start">
                                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        {/* 아이디 (수정 불가) */}
                        <div className="space-y-2">
                            <Label htmlFor="memberId">아이디</Label>
                            <Input id="memberId" value={profile?.memberId || ""} disabled className="bg-gray-50" />
                            <p className="text-xs text-muted-foreground">아이디는 변경할 수 없습니다.</p>
                        </div>

                        {/* 이름 */}
                        <div className="space-y-2">
                            <Label htmlFor="username">이름</Label>
                            <Input id="username" name="username" value={formData.username} onChange={handleChange} required />
                        </div>

                        {/* 이메일 */}
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                        </div>

                        {/* 프로필 이미지 URL */}
                        <div className="space-y-2">
                            <Label htmlFor="profileImage">프로필 이미지 URL</Label>
                            <Input
                                id="profileImage"
                                name="profileImage"
                                value={formData.profileImage}
                                onChange={handleChange}
                                placeholder="https://example.com/image.jpg"
                            />
                            <p className="text-xs text-muted-foreground">
                                이미지 URL을 입력하세요. 비워두면 기본 이미지가 사용됩니다.
                            </p>
                        </div>

                        {/* 자기소개 */}
                        <div className="space-y-2">
                            <Label htmlFor="introduce">자기소개</Label>
                            <Textarea
                                id="introduce"
                                name="introduce"
                                value={formData.introduce}
                                onChange={handleChange}
                                rows={4}
                                placeholder="자신을 소개해주세요"
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-between">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isSubmitting}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            계정 탈퇴
                        </Button>

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                "저장 중..."
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    변경사항 저장
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            {/* 계정 삭제 확인 모달 */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">계정 탈퇴 확인</h3>
                        <p className="mb-6">
                            정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 영구적으로 삭제됩니다.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isSubmitting}>
                                취소
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isSubmitting}>
                                {isSubmitting ? "처리 중..." : "계정 삭제"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

