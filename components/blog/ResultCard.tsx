"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

interface ResultCardProps {
  platform: "naver" | "thread";
  content: string;
}

export default function ResultCard({ platform, content }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

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
          {copied ? "복사됨" : "복사하기"}
        </button>
      </div>

      <div className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-gray-800">
        {content}
      </div>

      <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
        {content.length.toLocaleString()}자
      </div>
    </div>
  );
}
