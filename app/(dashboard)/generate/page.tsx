"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import GenerateForm from "@/components/blog/GenerateForm";
import ResultCard from "@/components/blog/ResultCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { createClientSafe } from "@/lib/supabase/client";
import { GenerateResponse } from "@/types";

export default function GeneratePage() {
  const [userEmail, setUserEmail] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  useEffect(() => {
    const supabase = createClientSafe();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? undefined);
    });
  }, []);

  return (
    <DashboardShell userEmail={userEmail}>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">새 글 생성</h1>
          <p className="mt-1 text-sm text-gray-500">
            배구·배구학원 키워드로 제목을 추천받고 JB스포츠 지침에 맞는 글을 생성하세요
          </p>
        </div>

        <GenerateForm
          onResult={(data) => setResult(data)}
          onLoading={setLoading}
        />

        {loading && (
          <div className="mt-8 border-t border-gray-100 pt-8">
            <LoadingSpinner />
          </div>
        )}

        {!loading && result && (
          <div className="mt-8 border-t border-gray-100 pt-8">
            <h2 className="mb-4 text-base font-bold text-gray-900">
              생성 결과
            </h2>
            {result.pipeline && (
              <p className="mb-4 text-xs text-gray-500">
                2단계 파이프라인 · {result.pipeline.char_count}자 · $
                {result.pipeline.total_cost_usd.toFixed(4)} USD
                {result.pipeline.status === "needs_review" && (
                  <span className="ml-2 text-amber-600">(검토 필요)</span>
                )}
              </p>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {result.naver_content && (
                <ResultCard
                  platform="naver"
                  content={result.naver_content}
                  hashtags={result.naver_hashtags}
                />
              )}
              {result.thread_content && (
                <ResultCard platform="thread" content={result.thread_content} />
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
