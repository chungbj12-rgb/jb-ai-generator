"use client";

// 주제 추천 + 직접 입력 + 플랫폼/톤 선택 통합 폼 컴포넌트
import { useState } from "react";
import ToneSelector from "@/components/ui/ToneSelector";
import TopicSuggester from "@/components/blog/TopicSuggester";
import { TEXT_PROVIDER_OPTIONS } from "@/lib/llm";
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
    keyword: "",
    tone: "friendly",
    platform: "naver",
    textProvider: "gemini",
  });
  const [error, setError] = useState<string | null>(null);

  // TopicSuggester에서 주제 선택 시 topic에 자동 반영
  const handleSelectTopic = (topic: string) => {
    setForm((prev) => ({ ...prev, topic }));
  };

  // 플랫폼 단일 선택 (둘 중 하나만)
  const handlePlatformSelect = (selected: "naver" | "thread") => {
    setForm((prev) => ({
      ...prev,
      platform: selected,
      topic: inputMode === "suggest" ? "" : prev.topic,
    }));
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

    if (isNaverSelected && !form.keyword.trim() && inputMode === "suggest") {
      setError("키워드를 입력하고 제목을 추천받아 주세요.");
      return;
    }

    onLoading(true);
    try {
      const endpoint = isNaverSelected
        ? "/api/blog-automation/generate-post"
        : "/api/generate";
      const body = isNaverSelected
        ? {
            keyword: form.keyword.trim() || form.topic.trim(),
            topic: form.topic.trim(),
            tone: form.tone,
          }
        : form;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          <TopicSuggester
            platform={form.platform}
            textProvider={form.textProvider}
            onSelectTopic={handleSelectTopic}
            onKeywordChange={(keyword) =>
              setForm((prev) => ({ ...prev, keyword }))
            }
          />
        )}

        {/* 직접 입력 모드: textarea */}
        {inputMode === "manual" && (
          <div className="space-y-2">
            {isNaverSelected && (
              <input
                type="text"
                value={form.keyword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, keyword: e.target.value }))
                }
                placeholder="SEO 키워드 (예: 수지배구학원)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            )}
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
                {isNaverSelected ? "선택된 제목" : "선택된 주제"}
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

      {/* ── STEP 3: AI 선택 (쓰레드만) ── */}
      {isThreadSelected && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
            Step 3 · AI 선택
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TEXT_PROVIDER_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer flex-col rounded-lg border px-3 py-3 transition-all ${
                  form.textProvider === option.id
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="textProvider"
                  value={option.id}
                  checked={form.textProvider === option.id}
                  onChange={() =>
                    setForm((prev) => ({ ...prev, textProvider: option.id }))
                  }
                  className="sr-only"
                />
                <span className="text-sm font-semibold text-gray-900">
                  {option.label}
                </span>
                <span className="mt-0.5 text-[11px] text-gray-500">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {isNaverSelected && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
          <p className="text-xs font-semibold text-emerald-800">
            Step 3 · 2단계 AI 파이프라인
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
            1단계 Gemini (검색·연구수집 → 사실 기반 초안) → 2단계 GPT-5.4 (직접 쓴 것처럼 정돈·브랜드 톤)
          </p>
        </div>
      )}

      {(isThreadSelected || isNaverSelected) && (
        <div className="border-t border-gray-100" />
      )}

      {/* ── STEP 4: 톤 선택 ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
          Step 4 · 톤 선택
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
