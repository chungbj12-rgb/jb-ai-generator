"use client";

import { useState } from "react";
import { Loader2, MessageSquareText, Sparkles } from "lucide-react";
import type { Platform } from "@/types";

const EXAMPLE_PROMPTS = [
  "본문의 3가지 이유를 우리 센터 장점 3가지로 바꿔줘: ① 한 반 2코치 ② 9대 셔틀버스 ③ 원장 상주·당일 사진",
  "결론 CTA를 체험 수업 유도 문구로 더 부드럽게 다듬어줘",
  "도입부 공감 문장을 학부모 걱정(아이 자신감)에 맞게 강화해줘",
];

interface ContentRevisionPanelProps {
  postId?: string;
  platform: Platform;
  topic: string;
  keyword?: string;
  content: string;
  onRevised: (data: {
    content: string;
    edits_summary: string;
    char_count: number;
    cost_usd: number;
  }) => void;
}

export default function ContentRevisionPanel({
  postId,
  platform,
  topic,
  keyword,
  content,
  onRevised,
}: ContentRevisionPanelProps) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLastSummary(null);

    const trimmed = feedback.trim();
    if (trimmed.length < 10) {
      setError("수정 요청을 10자 이상 구체적으로 작성해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/revise-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          platform,
          topic,
          keyword,
          currentContent: content,
          feedback: trimmed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "글 수정에 실패했습니다.");
        return;
      }

      setLastSummary(data.edits_summary);
      onRevised({
        content: data.revised_content,
        edits_summary: data.edits_summary,
        char_count: data.char_count,
        cost_usd: data.cost_usd,
      });
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-amber-700" />
        <h3 className="text-sm font-bold text-gray-900">AI 수정 요청</h3>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-gray-600">
        생성된 글에서 바꾸고 싶은 부분을 알려주세요. 예: &quot;3가지
        이유&quot;를 우리 센터 시스템·장점 3가지로 교체하고, 제공한 정보를
        반영해 다시 작성해 달라고 요청할 수 있습니다.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setFeedback(example)}
            className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-medium text-amber-800 hover:bg-amber-50"
          >
            예시 적용
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={`예시:\n본문에 나온 '초등 배구학원 선택 3가지'를 아래 우리 센터 정보로 바꿔줘.\n1) 한 반 코치 2명 동시 지도\n2) 9대 셔틀버스 아파트 정문 픽업\n3) 원장 상주 + 수업 당일 사진 업로드\n자존감·회복탄력성 교육 철학도 각 항목에 자연스럽게 넣어줘.`}
          rows={6}
          disabled={loading}
          className="w-full resize-y rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        {lastSummary && (
          <p className="rounded-lg bg-white px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-200">
            <span className="font-semibold">수정 요약:</span> {lastSummary}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              AI가 글을 수정하는 중…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              이 내용으로 글 수정하기
            </>
          )}
        </button>
      </form>
    </div>
  );
}
