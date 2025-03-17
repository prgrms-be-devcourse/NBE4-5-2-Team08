"use client";

import type React from "react";
import { useState } from "react";
import { Flag, X } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  curationId: number;
}

type ReportType = "abuse" | "spam" | "false_info" | "inappropriate";

interface ReportOption {
  value: ReportType;
  label: string;
}

const reportOptions: ReportOption[] = [
  { value: "abuse", label: "욕설 및 비방" },
  { value: "spam", label: "스팸 및 광고" },
  { value: "false_info", label: "허위 정보 또는 불법 콘텐츠" },
  { value: "inappropriate", label: "부적절한 내용 (음란물, 폭력 등)" },
];

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  curationId,
}) => {
  const [selectedReportType, setSelectedReportType] =
    useState<ReportType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReportTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSelectedReportType(event.target.value as ReportType);
  };

  const handleSubmit = async () => {
    if (!selectedReportType) {
      setError("신고 사유를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `http://52.78.27.224/api/v1/curation/${curationId}/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ reportType: selectedReportType }),
        }
      );

      if (!response.ok) {
        throw new Error("신고 처리 중 오류가 발생했습니다.");
      }

      const data = await response.json();
      setSubmitSuccess(true);

      // 3초 후 모달 닫기
      setTimeout(() => {
        onClose();
        setSubmitSuccess(false);
        setSelectedReportType(null);
      }, 3000);
    } catch (error) {
      console.error("신고 처리 오류:", error);
      setError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center mb-4">
          <Flag className="h-5 w-5 text-red-500 mr-2" />
          <h2 className="text-xl font-semibold">콘텐츠 신고</h2>
        </div>

        {submitSuccess ? (
          <div className="text-center py-8">
            <div className="text-green-500 font-medium mb-2">
              신고가 접수되었습니다.
            </div>
            <p className="text-sm text-gray-500">
              신고해주셔서 감사합니다. 검토 후 적절한 조치를 취하겠습니다.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-600">
              이 콘텐츠를 신고하는 이유를 선택해주세요. 신고된 콘텐츠는 검토 후
              적절한 조치가 취해집니다.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3 mb-6">
              {reportOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={option.value}
                    checked={selectedReportType === option.value}
                    onChange={handleReportTypeChange}
                    className="mt-1"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                disabled={isSubmitting || !selectedReportType}
              >
                {isSubmitting ? "처리 중..." : "신고하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
