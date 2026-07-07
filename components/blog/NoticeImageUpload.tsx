"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  MAX_NOTICE_IMAGES,
  MAX_NOTICE_IMAGE_SIZE_MB,
} from "@/lib/notice/constants";
import type { NoticeImageInput } from "@/types";

const MAX_IMAGES = MAX_NOTICE_IMAGES;
const MAX_SIZE_MB = MAX_NOTICE_IMAGE_SIZE_MB;

interface NoticeImageUploadProps {
  images: NoticeImageInput[];
  onChange: (images: NoticeImageInput[]) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

export default function NoticeImageUpload({
  images,
  onChange,
}: NoticeImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);

    const next = [...images];
    for (const file of Array.from(fileList)) {
      if (next.length >= MAX_IMAGES) {
        setError(`이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다.`);
        break;
      }
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드할 수 있습니다.");
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`이미지는 장당 ${MAX_SIZE_MB}MB 이하만 가능합니다.`);
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      next.push({
        mimeType: file.type,
        data: dataUrl,
        name: file.name,
      });
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
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
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] font-medium">추가</span>
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
        포스터·현장 사진 등 최대 {MAX_IMAGES}장 (장당 {MAX_SIZE_MB}MB). AI가
        이미지를 분석해 글에 반영합니다.
      </p>
      {error && (
        <p className="rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
