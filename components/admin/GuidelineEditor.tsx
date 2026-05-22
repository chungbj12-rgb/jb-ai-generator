"use client";

import { useMemo, useState } from "react";
import { Platform, PromptGuideline } from "@/types";

interface GuidelineEditorProps {
  guidelines: PromptGuideline[];
}

const TABS: { key: Platform; label: string }[] = [
  { key: "naver", label: "네이버" },
  { key: "thread", label: "쓰레드" },
];

function buildContentMap(guidelines: PromptGuideline[]) {
  return guidelines.reduce<Record<string, string>>((acc, g) => {
    acc[g.platform] = g.content;
    return acc;
  }, {});
}

/** 플랫폼별 프롬프트 지침 편집기 */
export default function GuidelineEditor({ guidelines }: GuidelineEditorProps) {
  const initialDrafts = useMemo(() => buildContentMap(guidelines), [guidelines]);

  const [activeTab, setActiveTab] = useState<Platform>("naver");
  const [drafts, setDrafts] = useState<Record<string, string>>(initialDrafts);
  const [originals, setOriginals] =
    useState<Record<string, string>>(initialDrafts);
  const [meta, setMeta] = useState<PromptGuideline[]>(guidelines);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const activeGuideline = meta.find((g) => g.platform === activeTab);
  const hasChanges = drafts[activeTab] !== originals[activeTab];

  function handleReset() {
    setDrafts((prev) => ({
      ...prev,
      [activeTab]: originals[activeTab] ?? "",
    }));
  }

  async function handleSave() {
    if (!hasChanges || !activeGuideline) return;

    setSaving(true);
    setSavedMsg(false);

    try {
      const res = await fetch("/api/guidelines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: activeTab,
          title: activeGuideline.title,
          content: drafts[activeTab],
        }),
      });

      if (!res.ok) {
        throw new Error("저장 실패");
      }

      const { guideline } = (await res.json()) as { guideline: PromptGuideline };

      setOriginals((prev) => ({
        ...prev,
        [activeTab]: guideline.content,
      }));
      setMeta((prev) =>
        prev.map((g) => (g.platform === activeTab ? guideline : g)),
      );
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch {
      alert("지침 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* 상단 메타 + 액션 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="text-xs text-gray-500">
          {activeGuideline ? (
            <>
              마지막 수정:{" "}
              <span className="font-medium text-gray-700">
                {activeGuideline.updated_by ?? "—"}
              </span>
              <span className="mx-2 text-gray-300">|</span>
              {formatDate(activeGuideline.updated_at)}
            </>
          ) : (
            "지침 데이터 없음"
          )}
        </div>
        <div className="flex items-center gap-2">
          {savedMsg && (
            <span className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600">
              ✅ 저장되었습니다
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors ${
              hasChanges
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "cursor-not-allowed bg-indigo-300"
            }`}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-100 px-5">
        {TABS.map((tab) => {
          const changed = drafts[tab.key] !== originals[tab.key];
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-b-2 border-indigo-600 text-indigo-700"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
              {changed && (
                <span className="text-orange-400" aria-label="변경됨">
                  ●
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 좌우 2분할 편집/미리보기 */}
      <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-2">
        <div className="border-b border-gray-100 p-5 lg:border-b-0 lg:border-r">
          <p className="mb-2 text-xs font-semibold text-gray-600">편집</p>
          <textarea
            value={drafts[activeTab] ?? ""}
            onChange={(e) =>
              setDrafts((prev) => ({ ...prev, [activeTab]: e.target.value }))
            }
            className="h-[440px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            spellCheck={false}
          />
        </div>
        <div className="p-5">
          <p className="mb-2 text-xs font-semibold text-gray-600">미리보기</p>
          <div className="h-[440px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
              {drafts[activeTab] ?? ""}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
