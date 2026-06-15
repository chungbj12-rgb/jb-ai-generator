"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Terminal,
} from "lucide-react";
import ToneSelector from "@/components/ui/ToneSelector";
import type { Tone } from "@/types";
import type { AgentJob, AgentJobStatus, PrepareAgentRequest } from "@/types/agent";

const STATUS_LABEL: Record<AgentJobStatus, string> = {
  pending: "대기",
  preparing: "준비 중",
  ready: "실행 대기",
  posting: "포스팅 중",
  draft_saved: "임시저장 완료",
  failed: "실패",
};

const TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1",
];

const IMAGE_MODELS = [
  "imagen-4.0-generate-001",
  "imagen-3.0-generate-002",
  "dall-e-3",
  "gpt-image-1",
];

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export default function AutomateForm() {
  const [form, setForm] = useState<PrepareAgentRequest>({
    naverId: "",
    naverPassword: "",
    blogId: "",
    topic: "",
    ctaText: "",
    ctaButtonText: "",
    ctaButtonLink: "",
    textModel: "gemini-2.5-flash",
    imageModel: "imagen-4.0-generate-001",
    apiKey: "",
    tone: "friendly",
    imageCount: 7,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<AgentJob | null>(null);
  const [copied, setCopied] = useState(false);

  const cliCommand = job
    ? `npm run agent -- --job-id ${job.id} --config agent.config.local.json`
    : `npm run agent -- --config agent.config.local.json`;

  function update<K extends keyof PrepareAgentRequest>(
    key: K,
    value: PrepareAgentRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePrepare(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setJob(null);

    try {
      const res = await fetch("/api/agent/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "준비 실패");

      const jobRes = await fetch(`/api/agent/jobs/${data.jobId}`);
      const jobData = await jobRes.json();
      setJob(jobData.job as AgentJob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "준비 중 오류");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyCommand() {
    await navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <div>
            <h2 className="text-sm font-semibold text-indigo-900">
              네이버 블로그 자동화 에이전트
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-indigo-800/80">
              네이버 계정·CTA·AI 모델을 입력하면 콘텐츠를 기획합니다.
              포스팅은 로컬 CLI가 네이버 로그인 후 이미지 생성·임시저장까지 수행합니다.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handlePrepare}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">네이버 계정</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">네이버 아이디</label>
              <input
                className={inputClass}
                value={form.naverId}
                onChange={(e) => update("naverId", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">네이버 비밀번호</label>
              <input
                type="password"
                className={inputClass}
                value={form.naverPassword}
                onChange={(e) => update("naverPassword", e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">블로그 ID</label>
              <input
                className={inputClass}
                placeholder="blog.naver.com/여기에_해당하는_ID"
                value={form.blogId}
                onChange={(e) => update("blogId", e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">콘텐츠</h3>
          <label className="mb-1 block text-xs text-gray-500">글 주제</label>
          <textarea
            className={inputClass}
            rows={3}
            value={form.topic}
            onChange={(e) => update("topic", e.target.value)}
            required
          />
          <div className="mt-3">
            <ToneSelector value={form.tone} onChange={(t) => update("tone", t)} />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">CTA</h3>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">CTA 문구</label>
              <input
                className={inputClass}
                value={form.ctaText}
                onChange={(e) => update("ctaText", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-500">CTA 버튼 문구</label>
                <input
                  className={inputClass}
                  value={form.ctaButtonText}
                  onChange={(e) => update("ctaButtonText", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">CTA 버튼 링크</label>
                <input
                  type="url"
                  className={inputClass}
                  value={form.ctaButtonLink}
                  onChange={(e) => update("ctaButtonLink", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <KeyRound className="h-4 w-4" />
            AI 모델 · API 키
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">글 생성 모델</label>
              <select
                className={inputClass}
                value={form.textModel}
                onChange={(e) => update("textModel", e.target.value)}
              >
                {TEXT_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">이미지 생성 모델</label>
              <select
                className={inputClass}
                value={form.imageModel}
                onChange={(e) => update("imageModel", e.target.value)}
              >
                {IMAGE_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">
                API 키 (Gemini/OpenAI 통합 또는 해당 키)
              </label>
              <input
                type="password"
                className={inputClass}
                placeholder="세션용 — 서버 env 키가 있으면 비워도 됨"
                value={form.apiKey ?? ""}
                onChange={(e) => update("apiKey", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">이미지 수 (6~8)</label>
              <input
                type="number"
                min={6}
                max={8}
                className={inputClass}
                value={form.imageCount ?? 7}
                onChange={(e) => update("imageCount", Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              콘텐츠 기획 중...
            </>
          ) : (
            <>
              <Bot className="h-4 w-4" />
              에이전트 작업 준비
            </>
          )}
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Terminal className="h-4 w-4" />
          로컬 실행
        </h3>
        <p className="mb-3 text-sm text-gray-600">
          1. <code className="rounded bg-gray-100 px-1">cp agent.config.example.json agent.config.local.json</code> 후
          네이버 계정·API 키 입력<br />
          2. 아래 명령어 실행 → 이미지 생성 · 네이버 임시저장
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-3">
          <code className="flex-1 overflow-x-auto text-xs text-emerald-300">{cliCommand}</code>
          <button
            type="button"
            onClick={handleCopyCommand}
            className="shrink-0 rounded-md border border-gray-600 p-1.5 text-gray-300 hover:bg-gray-800"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        {copied && <p className="mt-2 text-xs text-emerald-600">복사됨</p>}
      </div>

      {job && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            작업 준비 완료
          </div>
          <dl className="mt-3 grid gap-2 text-sm text-emerald-900/90 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-emerald-700">Job ID</dt>
              <dd className="font-mono text-xs">{job.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-emerald-700">상태</dt>
              <dd>{STATUS_LABEL[job.status]}</dd>
            </div>
            {job.config && (
              <>
                <div>
                  <dt className="text-xs text-emerald-700">블로그 ID</dt>
                  <dd>{job.config.blogId}</dd>
                </div>
                <div>
                  <dt className="text-xs text-emerald-700">모델</dt>
                  <dd className="text-xs">{job.config.textModel} / {job.config.imageModel}</dd>
                </div>
              </>
            )}
            {job.payload && (
              <>
                <div>
                  <dt className="text-xs text-emerald-700">제목</dt>
                  <dd>{job.payload.title}</dd>
                </div>
                <div>
                  <dt className="text-xs text-emerald-700">본문 / 이미지</dt>
                  <dd>
                    {job.payload.totalChars.toLocaleString()}자 · {job.payload.imageCount}장
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
