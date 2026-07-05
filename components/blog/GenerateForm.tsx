"use client";

import { useState } from "react";
import ToneSelector from "@/components/ui/ToneSelector";
import TopicSuggester from "@/components/blog/TopicSuggester";
import NoticeImageUpload from "@/components/blog/NoticeImageUpload";
import { TEXT_PROVIDER_OPTIONS } from "@/lib/llm";
import { getNoticeTypeLabel } from "@/lib/prompts/notice-prompts";
import { THREAD_ACCOUNT_OPTIONS } from "@/lib/prompts/threadsPrompts";
import {
  GenerateFormState,
  GenerateResponse,
  NoticeImageInput,
  NoticeType,
  Platform,
} from "@/types";

interface GenerateFormProps {
  onResult: (result: GenerateResponse) => void;
  onLoading: (loading: boolean) => void;
}

type InputMode = "suggest" | "manual";

const NOTICE_TYPE_OPTIONS: { value: NoticeType; label: string }[] = [
  { value: "new_class", label: "신규 클래스 소개" },
  { value: "announcement", label: "공지사항" },
  { value: "event", label: "이벤트·대회" },
  { value: "general", label: "일반 안내" },
];

export default function GenerateForm({
  onResult,
  onLoading,
}: GenerateFormProps) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("suggest");
  const [noticeImages, setNoticeImages] = useState<NoticeImageInput[]>([]);
  const [form, setForm] = useState<GenerateFormState>({
    topic: "",
    keyword: "",
    tone: "friendly",
    platform: "naver",
    textProvider: "gemini",
    threadAccountType: "center",
    noticeType: "new_class",
    noticeSourceInfo: "",
  });
  const [error, setError] = useState<string | null>(null);

  const isNaverSelected = platform === "naver";
  const isThreadSelected = platform === "thread";
  const isNoticeSelected = platform === "notice";

  const handlePlatformSelect = (selected: Platform) => {
    setPlatform(selected);
    setForm((prev) => ({
      ...prev,
      platform: selected,
      topic: "",
      keyword: "",
      noticeSourceInfo: "",
    }));
    setNoticeImages([]);
    setInputMode("suggest");
    setError(null);
  };

  const handleSelectTopic = (topic: string) => {
    setForm((prev) => ({ ...prev, topic }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!platform) {
      setError("작성 유형을 먼저 선택해 주세요.");
      return;
    }

    if (isNaverSelected) {
      if (!form.topic.trim()) {
        setError("주제를 추천받아 선택하거나 직접 입력해 주세요.");
        return;
      }
      if (inputMode === "suggest" && !form.keyword.trim()) {
        setError("키워드를 입력하고 제목을 추천받아 주세요.");
        return;
      }
    }

    if (isThreadSelected && !form.keyword.trim()) {
      setError("키워드를 입력해 주세요.");
      return;
    }

    if (isNoticeSelected) {
      if (!form.topic.trim()) {
        setError("공지·안내 글 제목을 입력해 주세요.");
        return;
      }
      if (!form.noticeSourceInfo.trim()) {
        setError("안내 정보(일정·대상·내용 등)를 입력해 주세요.");
        return;
      }
    }

    onLoading(true);
    try {
      if (isNoticeSelected) {
        const res = await fetch("/api/notice/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.topic.trim(),
            noticeType: form.noticeType,
            sourceInfo: form.noticeSourceInfo.trim(),
            tone: form.tone,
            images: noticeImages.map(({ mimeType, data, name }) => ({
              mimeType,
              data,
              name,
            })),
          }),
        });
        const data: GenerateResponse = await res.json();
        if (!res.ok) {
          setError(data.error || "글 생성에 실패했습니다.");
          return;
        }
        onResult(data);
        return;
      }

      if (isNaverSelected) {
        const res = await fetch("/api/blog-automation/generate-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: form.keyword.trim() || form.topic.trim(),
            topic: form.topic.trim(),
            tone: form.tone,
          }),
        });
        const data: GenerateResponse = await res.json();
        if (!res.ok) {
          setError(data.error || "글 생성에 실패했습니다.");
          return;
        }
        onResult(data);
        return;
      }

      const threadKeyword = form.keyword.trim();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "thread",
          keyword: threadKeyword,
          topic: threadKeyword,
          textProvider: form.textProvider,
          accountType: form.threadAccountType,
        }),
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
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
          Step 1 · 작성 유형 선택
        </p>
        <div
          role="radiogroup"
          aria-label="작성 유형 선택"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all ${
              isNaverSelected
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
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
          </label>
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all ${
              isThreadSelected
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
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
          </label>
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all ${
              isNoticeSelected
                ? "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-200"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="platform"
              value="notice"
              checked={isNoticeSelected}
              onChange={() => handlePlatformSelect("notice")}
              className="sr-only"
            />
            <span className="text-base">📢</span> 공지·안내
          </label>
        </div>
        {!platform && (
          <p className="mt-2 text-xs text-gray-500">
            유형을 선택하면 다음 단계가 표시됩니다.
          </p>
        )}
      </div>

      {platform && <div className="border-t border-gray-100" />}

      {isNoticeSelected && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
              Step 2 · 안내 유형
            </p>
            <div className="grid grid-cols-2 gap-2">
              {NOTICE_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2.5 text-center text-xs font-medium transition-all ${
                    form.noticeType === opt.value
                      ? "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-200"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="noticeType"
                    value={opt.value}
                    checked={form.noticeType === opt.value}
                    onChange={() =>
                      setForm((prev) => ({ ...prev, noticeType: opt.value }))
                    }
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
              Step 3 · 제목
            </p>
            <input
              type="text"
              value={form.topic}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, topic: e.target.value }))
              }
              placeholder="예: 2025 봄 신규 초등 배구 클래스 오픈 안내"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
              Step 4 · 안내 정보 입력
            </p>
            <p className="mb-2 text-[11px] text-gray-500">
              일정, 대상 연령, 수업 시간, 비용, 신청 방법 등 글에 넣을 사실을
              그대로 적어 주세요.
            </p>
            <textarea
              value={form.noticeSourceInfo}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  noticeSourceInfo: e.target.value,
                }))
              }
              placeholder={`예:\n- 대상: 초등 3~4학년\n- 개강: 3월 10일(월)\n- 시간: 월·수·금 17:00~18:30\n- 장소: JB스포츠 배구전문센터\n- 체험: 무료 (사전 예약)\n- 문의: 031-266-5779`}
              rows={8}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
              Step 5 · 참고 사진 (선택)
            </p>
            <NoticeImageUpload images={noticeImages} onChange={setNoticeImages} />
          </div>
        </div>
      )}

      {isNaverSelected && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
              Step 2 · 주제 찾기
            </p>
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

          {inputMode === "suggest" && (
            <TopicSuggester
              platform="naver"
              textProvider={form.textProvider}
              onSelectTopic={handleSelectTopic}
              onKeywordChange={(keyword) =>
                setForm((prev) => ({ ...prev, keyword }))
              }
            />
          )}

          {inputMode === "manual" && (
            <div className="space-y-2">
              <input
                type="text"
                value={form.keyword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, keyword: e.target.value }))
                }
                placeholder="SEO 키워드 (예: 수지배구학원)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <textarea
                value={form.topic}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, topic: e.target.value }))
                }
                placeholder="블로그 제목·주제"
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          {inputMode === "suggest" && form.topic && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
              <span className="flex-shrink-0 text-sm text-indigo-500">✓</span>
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[10px] font-medium text-indigo-500">
                  선택된 제목
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
      )}

      {isThreadSelected && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
            Step 2 · 키워드 입력
          </p>
          <p className="mb-2 text-[11px] text-gray-500">
            키워드만 입력하면 관련 쓰레드 글을 자동으로 작성합니다.
          </p>
          <input
            type="text"
            value={form.keyword}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, keyword: e.target.value }))
            }
            placeholder="키워드 입력 (예: 용인배구학원, 초등배구)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>
      )}

      {platform && <div className="border-t border-gray-100" />}

      {isThreadSelected && (
        <>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
              Step 3 · 계정 타입
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {THREAD_ACCOUNT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col rounded-lg border px-3 py-3 transition-all ${
                    form.threadAccountType === option.value
                      ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="threadAccountType"
                    value={option.value}
                    checked={form.threadAccountType === option.value}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        threadAccountType: option.value,
                      }))
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
          <div className="border-t border-gray-100" />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
              Step 4 · AI 선택
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
                      setForm((prev) => ({
                        ...prev,
                        textProvider: option.id,
                      }))
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
        </>
      )}

      {isNaverSelected && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
          <p className="text-xs font-semibold text-emerald-800">
            Step 3 · 2단계 AI 파이프라인
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
            1단계 Gemini (검색·연구수집 → 사실 기반 초안) → 2단계 GPT-5.4
            (직접 쓴 것처럼 정돈·브랜드 톤)
          </p>
        </div>
      )}

      {isNoticeSelected && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-xs font-semibold text-amber-900">
            Step 6 · AI 안내 글 생성
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
            입력하신 정보와 사진을 Gemini가 분석해{" "}
            {getNoticeTypeLabel(form.noticeType)} 네이버 블로그 글을 작성합니다.
            사진이 있으면 본문에 [이미지N] 삽입 위치도 표시됩니다.
          </p>
        </div>
      )}

      {(isNaverSelected || isNoticeSelected) && (
        <>
          <div className="border-t border-gray-100" />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
              {isNoticeSelected ? "톤 선택" : "Step 4 · 톤 선택"}
            </p>
            <ToneSelector
              value={form.tone}
              onChange={(tone) => setForm((prev) => ({ ...prev, tone }))}
            />
          </div>
        </>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!platform}
        className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-white transition-all active:scale-[0.98] disabled:opacity-60 ${
          isNoticeSelected
            ? "bg-amber-600 hover:bg-amber-700"
            : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {isNoticeSelected ? "📢 안내 글 생성하기" : "✨ 글 생성하기"}
      </button>
    </form>
  );
}
