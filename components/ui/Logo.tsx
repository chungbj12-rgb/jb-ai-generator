import { PenLine } from "lucide-react";

interface LogoProps {
  showText?: boolean;
  size?: "sm" | "md";
}

/** AI 블로그 생성기 로고 (보라색 사각형 + ai 아이콘) */
export default function Logo({ showText = true, size = "md" }: LogoProps) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex ${box} items-center justify-center bg-indigo-600 text-white shadow-sm`}
      >
        <PenLine className={icon} strokeWidth={2.5} />
      </span>
      {showText && (
        <span className="text-sm font-bold tracking-tight text-gray-900">
          AI 블로그 생성기
        </span>
      )}
    </div>
  );
}
