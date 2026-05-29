"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

interface ResultCardProps {
  platform: "naver" | "thread";
  content: string;
  hashtags?: string[];
}

export default function ResultCard({
  platform,
  content,
  hashtags,
}: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [hashtagsCopied, setHashtagsCopied] = useState(false);

  const isNaver = platform === "naver";
  const label = isNaver ? "네이버 블로그" : "쓰레드";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 무시
    }
  }

  async function handleCopyHashtags() {
    if (!hashtags?.length) return;
    try {
      await navigator.clipboard.writeText(hashtags.join(" "));
      setHashtagsCopied(true);
      setTimeout(() => setHashtagsCopied(false), 2000);
    } catch {
      // 무시
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span
          className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${
            isNaver
              ? "bg-emerald-50 text-emerald-700"
              : "bg-indigo-50 text-indigo-700"
          }`}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "복사됨" : "본문 복사"}
        </button>
      </div>

      <div className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-gray-800">
        {content}
      </div>

      {isNaver && hashtags && hashtags.length > 0 && (
        <div className="border-t border-gray-100 bg-emerald-50/40 px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-emerald-800">
              추천 해시태그 (연관 키워드 · {hashtags.length}개)
            </p>
            <button
              type="button"
              onClick={handleCopyHashtags}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <Copy className="h-3.5 w-3.5" />
              {hashtagsCopied ? "복사됨" : "전체 복사"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-emerald-700/80">
            네이버 블로그 발행 시 태그·본문 말미에 활용하세요.
          </p>
        </div>
      )}

      <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
        {content.length.toLocaleString()}자
      </div>
    </div>
  );
}
