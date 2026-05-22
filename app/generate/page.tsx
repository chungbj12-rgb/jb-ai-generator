"use client";

import { useState } from "react";

/** 게시 플랫폼 종류 */
type Platform = "naver" | "threads";
/** 글 톤 종류 (기본값: friendly = 친근하게) */
type Tone = "friendly" | "professional" | "emotional";

/** 플랫폼 선택 버튼 목록 */
const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "naver", label: "네이버 블로그" },
  { id: "threads", label: "쓰레드" },
];

/** 톤 선택 버튼 목록 */
const TONES: { id: Tone; label: string }[] = [
  { id: "friendly", label: "친근하게" },
  { id: "professional", label: "전문적으로" },
  { id: "emotional", label: "감성적으로" },
];

/** 선택형 버튼 공통 스타일 */
function choiceButtonClass(selected: boolean): string {
  return selected
    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50";
}

export default function GeneratePage() {
  const [topic, setTopic] = useState(""); // 주제 입력값
  const [platform, setPlatform] = useState<Platform>("naver"); // 선택된 플랫폼
  const [tone, setTone] = useState<Tone>("friendly"); // 선택된 톤 (기본: 친근하게)
  const [loading, setLoading] = useState(false); // 생성 중 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 메시지
  const [result, setResult] = useState(""); // 생성된 글 본문
  const [copyDone, setCopyDone] = useState(false); // 복사 완료 피드백
  const [saving, setSaving] = useState(false); // Supabase 저장 중
  const [saveDone, setSaveDone] = useState(false); // 저장 완료 피드백

  /** 글 생성 API 호출 */
  async function handleGenerate() {
    const trimmed = topic.trim();
    if (!trimmed) {
      setError("주제를 입력해 주세요.");
      return;
    }

    setError(null);
    setCopyDone(false);
    setSaveDone(false);
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, platform, tone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "글 생성에 실패했습니다.");
        return;
      }

      setResult(data.content ?? "");
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  /** 클립보드에 복사 */
  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setError("복사에 실패했습니다.");
    }
  }

  /** Supabase posts 테이블에 저장 */
  async function handleSave() {
    if (!result || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          platform,
          tone,
          content: result,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      setSaveDone(true);
      setTimeout(() => setSaveDone(false), 2000);
    } catch {
      setError("저장 중 네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  /** 입력·결과 초기화 후 다시 생성 */
  function handleRegenerate() {
    setResult("");
    setError(null);
    handleGenerate();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          AI 블로그 글 생성
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          주제와 플랫폼, 톤을 선택하면 AI가 글을 작성해 드립니다.
        </p>
      </header>

      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* 1. 주제 입력 */}
        <section>
          <label
            htmlFor="topic"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            주제
          </label>
          <textarea
            id="topic"
            rows={4}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 오늘 간 카페 추천"
            className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            disabled={loading}
          />
        </section>

        {/* 2. 플랫폼 선택 */}
        <section>
          <p className="mb-2 text-sm font-medium text-gray-700">플랫폼</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                disabled={loading}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${choiceButtonClass(platform === p.id)}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* 3. 톤 선택 (기본: 친근하게) */}
        <section>
          <p className="mb-2 text-sm font-medium text-gray-700">톤</p>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                disabled={loading}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${choiceButtonClass(tone === t.id)}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* 에러 메시지 */}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* 4. 글 생성하기 */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden
              />
              AI가 글을 쓰는 중...
            </>
          ) : (
            "글 생성하기"
          )}
        </button>
      </div>

      {/* 5. 결과 영역 */}
      {result && !loading && (
        <section className="mt-8 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800">생성된 글</h2>

          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={14}
            className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm leading-relaxed text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {copyDone ? "복사됨!" : "복사하기"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? "저장 중..." : saveDone ? "저장됨!" : "저장하기"}
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              다시 생성
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
