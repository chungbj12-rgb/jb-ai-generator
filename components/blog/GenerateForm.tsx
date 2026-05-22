"use client";

// 주제 추천 + 직접 입력 + 플랫폼/톤 선택 통합 폼 컴포넌트
import { useState } from "react";
import ToneSelector from "@/components/ui/ToneSelector";
import TopicSuggester from "@/components/blog/TopicSuggester";
import { GenerateFormState, GenerateResponse } from "@/types";

interface GenerateFormProps {
  onResult: (result: GenerateResponse) => void;
  onLoading: (loading: boolean) => void;
}

// 입력 모드: 키워드로 추천받기 vs 직접 입력
type InputMode = "suggest" | "manual";

export default function GenerateForm({
  onResult,
  onLoading,
}: GenerateFormProps) {
  const [inputMode, setInputMode] = useState<InputMode>("suggest");
  const [form, setForm] = useState<GenerateFormState>({
    topic: "",
    tone: "friendly",
    platform: "naver",
  });
  const [error, setError] = useState<string | null>(null);

  // TopicSuggester에서 주제 선택 시 topic에 자동 반영
  const handleSelectTopic = (topic: string) => {
    setForm((prev) => ({ ...prev, topic }));
  };

  // 플랫폼 단일 선택 (둘 중 하나만)
  const handlePlatformSelect = (selected: "naver" | "thread") => {
    setForm((prev) => ({ ...prev, platform: selected }));
  };

  const isNaverSelected = form.platform === "naver";
  const isThreadSelected = form.platform === "thread";

  // 글 생성 API 호출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.topic.trim()) {
      setError("주제를 선택하거나 직접 입력해주세요.");
      return;
    }

    onLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: GenerateResponse = await res.json();
      if (!res.ok) {
        setError(data.error || "글 생성에 실패했습니다.");
        return;
      }
      onResult(data);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      onLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── STEP 1: 주제 설정 ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
            Step 1 · 주제 설정
          </p>
          {/* 입력 모드 전환 토글 */}
          <div className="flex rounded-md bg-gray-100 p-0.5">
            <button
              type="button"
              onClick={() => setInputMode("suggest")}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
                inputMode === "suggest"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              ✨ AI 추천
            </button>
            <button
              type="button"
              onClick={() => setInputMode("manual")}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
                inputMode === "manual"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              ✏️ 직접 입력
            </button>
          </div>
        </div>

        {/* AI 추천 모드: TopicSuggester */}
        {inputMode === "suggest" && (
          <TopicSuggester onSelectTopic={handleSelectTopic} />
        )}

        {/* 직접 입력 모드: textarea */}
        {inputMode === "manual" && (
          <div>
            <textarea
              value={form.topic}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, topic: e.target.value }))
              }
              placeholder="예: 2025년 봄 제주도 여행 꿀팁 — 숨은 명소와 맛집 모음"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        )}

        {/* 선택된 주제 미리보기 (AI 추천 모드에서만 표시) */}
        {inputMode === "suggest" && form.topic && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
            <span className="flex-shrink-0 text-sm text-indigo-500">✓</span>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[10px] font-medium text-indigo-500">
                선택된 주제
              </p>
              <p className="text-sm leading-snug text-indigo-800">
                {form.topic}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, topic: "" }))}
              className="flex-shrink-0 text-lg leading-none text-indigo-300 hover:text-indigo-500"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100" />

      {/* ── STEP 2: 플랫폼 선택 (radio — 하나만 선택) ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
          Step 2 · 플랫폼 선택
        </p>
        <div
          role="radiogroup"
          aria-label="플랫폼 선택"
          className="grid grid-cols-2 gap-2"
        >
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all ${
              isNaverSelected
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="platform"
              value="naver"
              checked={isNaverSelected}
              onChange={() => handlePlatformSelect("naver")}
              className="sr-only"
            />
            <span className="text-base">📝</span> 네이버 블로그
            {isNaverSelected && (
              <span className="text-xs font-bold text-indigo-600">✓</span>
            )}
          </label>
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all ${
              isThreadSelected
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="platform"
              value="thread"
              checked={isThreadSelected}
              onChange={() => handlePlatformSelect("thread")}
              className="sr-only"
            />
            <span className="text-base">💬</span> 쓰레드
            {isThreadSelected && (
              <span className="text-xs font-bold text-indigo-600">✓</span>
            )}
          </label>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* ── STEP 3: 톤 선택 ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
          Step 3 · 톤 선택
        </p>
        <ToneSelector
          value={form.tone}
          onChange={(tone) => setForm((prev) => ({ ...prev, tone }))}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60"
      >
        ✨ 글 생성하기
      </button>
    </form>
  );
}
