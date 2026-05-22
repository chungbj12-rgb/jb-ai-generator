"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface TopicSuggesterProps {
  onSelectTopic: (topic: string) => void;
}

/** 키워드 기반 AI 주제 추천 컴포넌트 */
export default function TopicSuggester({ onSelectTopic }: TopicSuggesterProps) {
  const [keyword, setKeyword] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** /api/suggest-topics 호출 */
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
        body: JSON.stringify({ keyword: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "주제 추천에 실패했습니다.");
        return;
      }

      setTopics(data.topics ?? []);
      if (!data.topics?.length) {
        setError("추천 주제가 없습니다. 다른 키워드를 시도해 보세요.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSuggest();
            }
          }}
          placeholder="키워드 입력 (예: 제주 여행, 카페, 다이어트)"
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
          추천받기
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">
          {error}
        </p>
      )}

      {topics.length > 0 && (
        <ul className="space-y-2">
          {topics.map((topic) => (
            <li key={topic}>
              <button
                type="button"
                onClick={() => onSelectTopic(topic)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm text-gray-800 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
              >
                {topic}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
