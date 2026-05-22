"use client";

import { Tone, ToneOption } from "@/types";

const TONE_OPTIONS: ToneOption[] = [
  {
    value: "friendly",
    label: "친근체",
    emoji: "😊",
    description: "대화하듯 편안한 말투",
  },
  {
    value: "professional",
    label: "전문체",
    emoji: "💼",
    description: "신뢰감 있는 전문 톤",
  },
  {
    value: "emotional",
    label: "감성체",
    emoji: "✨",
    description: "감정에 공감하는 표현",
  },
];

interface ToneSelectorProps {
  value: Tone;
  onChange: (tone: Tone) => void;
}

/** 톤 선택 — 3개 가로 버튼 */
export default function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TONE_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg border px-3 py-3 text-sm font-medium transition-all active:scale-[0.98] ${
              selected
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {option.emoji} {option.label}
          </button>
        );
      })}
    </div>
  );
}
