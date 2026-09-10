"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  MAX_NOTICE_IMAGES,
  MAX_NOTICE_IMAGE_SIZE_MB,
  MAX_NOTICE_IMAGES_TOTAL_BYTES,
  NOTICE_IMAGE_MAX_EDGE_PX,
} from "@/lib/notice/constants";
import { prepareNoticeImages } from "@/lib/notice/compress-image";
import { formatMB, totalImagePayloadBytes } from "@/lib/notice/image-payload";
import type { NoticeImageInput } from "@/types";

const MAX_IMAGES = MAX_NOTICE_IMAGES;
const MAX_SIZE_MB = MAX_NOTICE_IMAGE_SIZE_MB;

interface NoticeImageUploadProps {
  images: NoticeImageInput[];
  onChange: (images: NoticeImageInput[]) => void;
}

export default function NoticeImageUpload({
  images,
  onChange,
}: NoticeImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const totalBytes = totalImagePayloadBytes(images);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    setProcessing(true);

    try {
      // 원본 포맷과 무관하게 JPEG·1280px로 재인코딩하고, 전체 합계 예산 안에서
      // quality를 낮춰 가며 맞춘다. 끝내 못 맞춘 사진은 skipped로 돌아온다.
      const { images: added, skipped } = await prepareNoticeImages(
        Array.from(fileList),
        images,
      );

      if (added.length > 0) {
        onChange([
          ...images,
          ...added.map(({ mimeType, data, name }) => ({ mimeType, data, name })),
        ]);
      }
      if (skipped.length > 0) {
        setError(skipped.map((s) => s.message).join("\n"));
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? `사진 처리 중 오류: ${e.message}`
          : "사진을 처리하지 못했습니다. 다시 시도해주세요.",
      );
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div
            key={`${img.name ?? "img"}-${i}`}
            className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.data}
              alt={img.name ?? `이미지 ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              aria-label="이미지 삭제"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            disabled={processing}
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60"
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            <span className="text-[10px] font-medium">
              {processing ? "압축 중" : "추가"}
            </span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-[11px] text-gray-500">
        포스터·현장 사진 등 최대 {MAX_IMAGES}장 (장당 {MAX_SIZE_MB}MB). 올리면
        자동으로 JPEG·{NOTICE_IMAGE_MAX_EDGE_PX}px로 압축되며, 전체 합계{" "}
        {formatMB(MAX_NOTICE_IMAGES_TOTAL_BYTES, 0)} 이내로 전송됩니다. AI가
        이미지를 분석해 글에 반영합니다.
        {images.length > 0 && (
          <span className="ml-1 text-gray-400">
            (현재 {images.length}장 · {formatMB(totalBytes)})
          </span>
        )}
      </p>
      {error && (
        <p className="whitespace-pre-line rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
