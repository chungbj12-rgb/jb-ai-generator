"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Platform, TextProvider } from "@/types";

interface TopicSuggesterProps {
  platform: Platform;
  textProvider: TextProvider;
  onSelectTopic: (topic: string) => void;
  onKeywordChange?: (keyword: string) => void;
}

/** 키워드 기반 AI 제목/주제 추천 */
export default function TopicSuggester({
  platform,
  textProvider,
  onSelectTopic,
  onKeywordChange,
}: TopicSuggesterProps) {
  const [keyword, setKeyword] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNaver = platform === "naver";

  // 플랫폼 변경 시 이전 추천 목록 초기화
  useEffect(() => {
    setTopics([]);
    setError(null);
  }, [platform, textProvider]);

  async function handleSuggest() {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setError("키워드를 입력해 주세요.");
      return;
    }

    setError(null);
    setLoading(true);
    setTopics([]);

    try {
      const res = await fetch("/api/suggest-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: trimmed, platform, textProvider }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "추천에 실패했습니다.");
        return;
      }

      setTopics(data.topics ?? []);
      if (data.warning) {
        setError(data.warning);
      }
      if (!data.topics?.length) {
        setError(
          isNaver
            ? "추천 제목이 없습니다. 다른 키워드를 시도해 보세요."
            : "추천 주제가 없습니다. 다른 키워드를 시도해 보세요.",
        );
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500">
        {isNaver
          ? "배구·배구학원 키워드로 JB스포츠 맞춤 제목 10개를 추천합니다."
          : "배구·학부모 관점 쓰레드 주제 5개를 추천합니다."}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            onKeywordChange?.(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSuggest();
            }
          }}
          placeholder="키워드 입력 (예: 용인배구학원, 수지배구레슨, 초등배구)"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
        />
        <button
          type="button"
          onClick={handleSuggest}
          disabled={loading}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isNaver ? "제목 추천" : "주제 추천"}
        </button>
      </div>

      {error && (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${
            topics.length > 0
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-500"
          }`}
        >
          {error}
        </p>
      )}

      {topics.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {isNaver ? `추천 제목 (${topics.length}개)` : `추천 주제 (${topics.length}개)`}
          </p>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {topics.map((topic, i) => (
              <li key={`${topic}-${i}`}>
                <button
                  type="button"
                  onClick={() => onSelectTopic(topic)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm text-gray-800 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
                >
                  <span className="mr-2 text-[10px] font-bold text-indigo-400">
                    {i + 1}
                  </span>
                  {topic}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
