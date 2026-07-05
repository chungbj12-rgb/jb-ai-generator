"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import GenerateForm from "@/components/blog/GenerateForm";
import ResultCard from "@/components/blog/ResultCard";
import ContentRevisionPanel from "@/components/blog/ContentRevisionPanel";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { createClientSafe } from "@/lib/supabase/client";
import { GenerateResponse } from "@/types";

export default function GeneratePage() {
  const [userEmail, setUserEmail] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [revisionCost, setRevisionCost] = useState(0);

  useEffect(() => {
    const supabase = createClientSafe();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? undefined);
    });
  }, []);

  const revisionTopic = result?.title || result?.topic || "";

  return (
    <DashboardShell userEmail={userEmail}>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">새 글 생성</h1>
          <p className="mt-1 text-sm text-gray-500">
            블로그·쓰레드·공지 안내 글을 JB스포츠 지침에 맞게 생성하세요
          </p>
        </div>

        <GenerateForm
          onResult={(data) => {
            setResult(data);
            setRevisionCost(0);
          }}
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
                {result.notice_type
                  ? `공지·안내 · ${result.pipeline.char_count}자`
                  : `2단계 파이프라인 · ${result.pipeline.char_count}자`}
                {!result.notice_type && (
                  <>
                    {" "}
                    · ${result.pipeline.total_cost_usd.toFixed(4)} USD
                  </>
                )}
                {result.used_images ? (
                  <span> · 참고 사진 {result.used_images}장</span>
                ) : null}
                {revisionCost > 0 && (
                  <span>
                    {" "}
                    · 수정 ${revisionCost.toFixed(4)} USD
                  </span>
                )}
                {result.pipeline.status === "needs_review" && (
                  <span className="ml-2 text-amber-600">(검토 필요)</span>
                )}
              </p>
            )}
            <div className="space-y-6">
              {result.naver_content && (
                <div className="space-y-4">
                  <ResultCard
                    platform="naver"
                    content={result.naver_content}
                    hashtags={result.naver_hashtags}
                  />
                  <ContentRevisionPanel
                    postId={result.id}
                    platform="naver"
                    topic={revisionTopic}
                    keyword={result.keyword}
                    content={result.naver_content}
                    onRevised={(data) => {
                      setResult((prev) =>
                        prev
                          ? {
                              ...prev,
                              naver_content: data.content,
                              pipeline: prev.pipeline
                                ? {
                                    ...prev.pipeline,
                                    char_count: data.char_count,
                                  }
                                : undefined,
                            }
                          : null,
                      );
                      setRevisionCost((c) => c + data.cost_usd);
                    }}
                  />
                </div>
              )}
              {result.thread_content && (
                <div className="space-y-4">
                  <ResultCard
                    platform="thread"
                    content={result.thread_content}
                  />
                  <ContentRevisionPanel
                    postId={result.id}
                    platform="thread"
                    topic={revisionTopic}
                    keyword={result.keyword}
                    content={result.thread_content}
                    onRevised={(data) => {
                      setResult((prev) =>
                        prev
                          ? { ...prev, thread_content: data.content }
                          : null,
                      );
                      setRevisionCost((c) => c + data.cost_usd);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
