"use client";

import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { toast } from "sonner";

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export interface QuillEditorRef {
  getContent: () => string;
}

const QuillEditor = forwardRef<QuillEditorRef, QuillEditorProps>(
  (
    { value, onChange, placeholder = "내용을 입력하세요...", readOnly = false },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<any>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      getContent: () => {
        return quillRef.current?.root.innerHTML || "";
      },
    }));

    useEffect(() => {
      if (typeof window !== "undefined") {
        // Load Quill CSS
        const link = document.createElement("link");
        link.href = "https://cdn.quilljs.com/1.3.6/quill.snow.css";
        link.rel = "stylesheet";
        document.head.appendChild(link);

        // Load Quill script
        import("quill").then((Quill) => {
          if (!editorRef.current || quillRef.current) return;

          // 이미지 업로드 핸들러 함수
          const imageHandler = () => {
            // 파일 입력 엘리먼트 생성
            const input = document.createElement("input");
            input.setAttribute("type", "file");
            input.setAttribute("accept", "image/*");
            input.click();

            // 파일 선택 이벤트 처리
            input.onchange = async () => {
              if (!input.files || input.files.length === 0) return;

              const file = input.files[0];

              // 파일 크기 제한 (10MB)
              if (file.size > 10 * 1024 * 1024) {
                toast.error("이미지 크기는 10MB 이하여야 합니다.");
                return;
              }

              // 이미지 파일 타입 확인
              if (!file.type.startsWith("image/")) {
                toast.error("이미지 파일만 업로드 ���능합니다.");
                return;
              }

              try {
                setIsUploading(true);

                // FormData 생성 및 파일 추가
                const formData = new FormData();
                formData.append("file", file);

                // 서버에 이미지 업로드 요청
                const apiUrl =
                  process.env.NEXT_PUBLIC_API_URL || "http://52.78.27.224";
                const response = await fetch(`${apiUrl}/api/v1/images/upload`, {
                  method: "POST",
                  body: formData,
                });

                if (!response.ok) {
                  throw new Error("이미지 업로드에 실패했습니다.");
                }

                // 업로드된 이미지 URL 받기
                const imageUrl = await response.text();

                // 현재 커서 위치 저장
                const range = quillRef.current.getSelection(true);

                // 이미지 URL을 에디터에 삽입
                quillRef.current.insertEmbed(range.index, "image", imageUrl);

                // 커서 위치 조정 (이미지 다음으로)
                quillRef.current.setSelection(range.index + 1);

                toast.success("이미지가 업로드되었습니다.");
              } catch (error) {
                console.error("이미지 업로드 오류:", error);
                toast.error("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
              } finally {
                setIsUploading(false);
              }
            };
          };

          // Quill 에디터 초기화
          const quill = new Quill.default(editorRef.current, {
            modules: {
              toolbar: {
                container: [
                  [{ header: [1, 2, 3, 4, 5, 6, false] }],
                  ["bold", "italic", "underline", "strike"],
                  [{ list: "ordered" }, { list: "bullet" }],
                  ["blockquote", "code-block"],
                  ["link", "image"],
                  ["clean"],
                ],
                handlers: {
                  image: imageHandler, // 이미지 핸들러 등록
                },
              },
            },
            placeholder: placeholder,
            theme: "snow",
            readOnly: readOnly || isUploading, // 업로드 중에는 편집 불가능하게 설정
          });

          // Set initial content
          quill.root.innerHTML = value;

          // Handle content change
          quill.on("text-change", () => {
            onChange(quill.root.innerHTML);
          });

          quillRef.current = quill;
        });

        return () => {
          // Clean up
          document.head.removeChild(link);
          quillRef.current = null;
        };
      }
    }, []);

    // Update content when value prop changes
    useEffect(() => {
      if (quillRef.current && value !== quillRef.current.root.innerHTML) {
        quillRef.current.root.innerHTML = value;
      }
    }, [value]);

    // 업로드 중일 때 오버레이 표시
    const uploadingOverlay = isUploading && (
      <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-sm font-medium">이미지 업로드 중...</p>
        </div>
      </div>
    );

    return (
      <div className="quill-editor-container relative">
        <div ref={editorRef} className="quill-editor"></div>
        {uploadingOverlay}
      </div>
    );
  }
);

QuillEditor.displayName = "QuillEditor";

export default QuillEditor;
