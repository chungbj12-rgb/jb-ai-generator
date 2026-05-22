"use client";

import { useState } from "react";
import {
  Eye,
  MessageCircle,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import { BlogPost, Tone } from "@/types";
import { formatDateShort, getDisplayName } from "@/lib/utils/display";
import ResultCard from "@/components/blog/ResultCard";

interface HistoryListProps {
  posts: BlogPost[];
  authorEmail?: string;
}

const TONE_LABEL: Record<Tone, string> = {
  friendly: "친근체",
  professional: "전문체",
  emotional: "감성체",
};

const TONE_BADGE: Record<Tone, string> = {
  friendly: "bg-indigo-50 text-indigo-700",
  professional: "bg-emerald-50 text-emerald-700",
  emotional: "bg-pink-50 text-pink-700",
};

/** 히스토리 목록 + 보기 모달 */
export default function HistoryList({ posts, authorEmail }: HistoryListProps) {
  const [platformFilter, setPlatformFilter] = useState("all");
  const [toneFilter, setToneFilter] = useState("all");
  const [viewPost, setViewPost] = useState<BlogPost | null>(null);

  const authorName = getDisplayName(authorEmail);

  const filtered = posts.filter((post) => {
    if (toneFilter !== "all" && post.tone !== toneFilter) return false;
    if (platformFilter === "naver" && !post.naver_content) return false;
    if (platformFilter === "thread" && !post.thread_content) return false;
    return true;
  });

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-20 text-center">
        <p className="text-sm font-medium text-gray-700">
          아직 생성한 글이 없습니다
        </p>
        <p className="mt-1 text-xs text-gray-500">
          글 생성 페이지에서 첫 글을 만들어 보세요
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">생성 히스토리</h3>
          <div className="flex gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-indigo-400 focus:outline-none"
            >
              <option value="all">전체 플랫폼</option>
              <option value="naver">네이버</option>
              <option value="thread">쓰레드</option>
            </select>
            <select
              value={toneFilter}
              onChange={(e) => setToneFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-indigo-400 focus:outline-none"
            >
              <option value="all">전체 톤</option>
              <option value="friendly">친근체</option>
              <option value="professional">전문체</option>
              <option value="emotional">감성체</option>
            </select>
          </div>
        </div>

        <ul className="divide-y divide-gray-100">
          {filtered.map((post) => {
            const tone = post.tone as Tone;
            const hasThread = !!post.thread_content;
            const hasNaver = !!post.naver_content;

            return (
              <li
                key={post.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/80"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  {hasThread && !hasNaver ? (
                    <MessageCircle className="h-4 w-4" />
                  ) : hasNaver && hasThread ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <PenLine className="h-4 w-4" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {post.topic}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {hasNaver && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        네이버
                      </span>
                    )}
                    {hasThread && (
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        쓰레드
                      </span>
                    )}
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${TONE_BADGE[tone]}`}
                    >
                      {TONE_LABEL[tone]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDateShort(post.created_at)} · {authorName}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewPost(post)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                  보기
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 상세 보기 모달 */}
      {viewPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewPost(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {viewPost.topic}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {formatDateShort(viewPost.created_at)} · {authorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewPost(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {viewPost.naver_content && (
                <ResultCard platform="naver" content={viewPost.naver_content} />
              )}
              {viewPost.thread_content && (
                <ResultCard
                  platform="thread"
                  content={viewPost.thread_content}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
