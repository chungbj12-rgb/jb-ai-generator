"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    acc[g.platform] = g.content ?? "";
    return acc;
  }, {});
}

function formatCharCount(n: number) {
  return `${n.toLocaleString()}자`;
}

/** 플랫폼별 프롬프트 지침 편집기 (길이 제한 없음) */
export default function GuidelineEditor({ guidelines }: GuidelineEditorProps) {
  const initialDrafts = useMemo(() => buildContentMap(guidelines), [guidelines]);

  const [activeTab, setActiveTab] = useState<Platform>("naver");
  const draftsRef = useRef<Record<string, string>>({ ...initialDrafts });
  const [originals, setOriginals] =
    useState<Record<string, string>>(initialDrafts);
  const [meta, setMeta] = useState<PromptGuideline[]>(guidelines);
  const [previewText, setPreviewText] = useState(initialDrafts.naver ?? "");
  const [charCount, setCharCount] = useState(
    (initialDrafts.naver ?? "").length,
  );
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeGuideline = meta.find((g) => g.platform === activeTab);

  const syncTextareaFromDraft = useCallback((platform: Platform) => {
    const text = draftsRef.current[platform] ?? "";
    if (textareaRef.current) {
      textareaRef.current.value = text;
    }
    setPreviewText(text);
    setCharCount(text.length);
  }, []);

  const [dirtyTabs, setDirtyTabs] = useState<Record<string, boolean>>({});

  const persistCurrentTab = useCallback(() => {
    if (textareaRef.current) {
      draftsRef.current[activeTab] = textareaRef.current.value;
    }
  }, [activeTab]);

  const hasChanges = dirtyTabs[activeTab] ?? false;

  const updateDirty = useCallback(
    (platform: Platform, value: string) => {
      setDirtyTabs((prev) => ({
        ...prev,
        [platform]: value !== (originals[platform] ?? ""),
      }));
    },
    [originals],
  );

  useEffect(() => {
    syncTextareaFromDraft(activeTab);
  }, [activeTab, syncTextareaFromDraft]);

  function handleTabChange(platform: Platform) {
    if (textareaRef.current) {
      const value = textareaRef.current.value;
      draftsRef.current[activeTab] = value;
      updateDirty(activeTab, value);
    }
    setActiveTab(platform);
    setSaveError(null);
  }

  function handleInput() {
    const value = textareaRef.current?.value ?? "";
    draftsRef.current[activeTab] = value;
    setCharCount(value.length);
    updateDirty(activeTab, value);

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setPreviewText(value);
    }, 200);
  }

  function handleReset() {
    const original = originals[activeTab] ?? "";
    draftsRef.current[activeTab] = original;
    if (textareaRef.current) {
      textareaRef.current.value = original;
    }
    setPreviewText(original);
    setCharCount(original.length);
    updateDirty(activeTab, original);
    setSaveError(null);
  }

  async function handleSave() {
    if (!activeGuideline) return;
    persistCurrentTab();

    const content = draftsRef.current[activeTab] ?? "";

    setSaving(true);
    setSavedMsg(false);
    setSaveError(null);

    try {
      const res = await fetch("/api/guidelines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: activeTab,
          title: activeGuideline.title,
          content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error ?? "지침 저장에 실패했습니다.");
        return;
      }

      const { guideline } = data as { guideline: PromptGuideline };

      draftsRef.current[activeTab] = guideline.content;
      setOriginals((prev) => ({
        ...prev,
        [activeTab]: guideline.content,
      }));
      setMeta((prev) =>
        prev.map((g) => (g.platform === activeTab ? guideline : g)),
      );
      if (textareaRef.current) {
        textareaRef.current.value = guideline.content;
      }
      setPreviewText(guideline.content);
      setCharCount(guideline.content.length);
      setDirtyTabs((prev) => ({ ...prev, [activeTab]: false }));
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch {
      setSaveError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
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
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-indigo-600">
                글자 수 제한 없음 · 현재 {formatCharCount(charCount)}
              </span>
            </>
          ) : (
            "지침 데이터 없음"
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedMsg && (
            <span className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600">
              ✅ 저장되었습니다 ({formatCharCount(charCount)})
            </span>
          )}
          {saveError && (
            <span className="max-w-md rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">
              {saveError}
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
            disabled={!hasChanges || saving || !activeGuideline}
            className={`rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors ${
              hasChanges && !saving
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "cursor-not-allowed bg-indigo-300"
            }`}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-100 px-5">
        {TABS.map((tab) => {
          const changed = dirtyTabs[tab.key] ?? false;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
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

      <div className="grid min-h-[70vh] grid-cols-1 lg:grid-cols-2">
        <div className="flex min-h-[70vh] flex-col border-b border-gray-100 p-5 lg:border-b-0 lg:border-r">
          <p className="mb-2 text-xs font-semibold text-gray-600">
            편집 (붙여넣기·장문 프롬프트 모두 가능)
          </p>
          <textarea
            ref={textareaRef}
            key={activeTab}
            defaultValue={draftsRef.current[activeTab] ?? ""}
            onInput={handleInput}
            className="min-h-[calc(70vh-3rem)] w-full flex-1 resize-y rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            spellCheck={false}
            aria-label="지침 편집"
          />
        </div>
        <div className="flex min-h-[70vh] flex-col p-5">
          <p className="mb-2 text-xs font-semibold text-gray-600">미리보기</p>
          <div className="min-h-[calc(70vh-3rem)] flex-1 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
              {previewText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
