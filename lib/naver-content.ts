import { generateBlogText } from "@/lib/llm";
import type { TextProvider } from "@/lib/llm";
import {
  getNaverLengthBounds,
  isNaverContentTooShort,
} from "@/lib/naver-length";
import { buildNaverExpandPrompt, buildNaverPrompt } from "@/lib/prompts";
import { Tone } from "@/types";

/** 네이버 블로그 본문 생성 (분량 부족 시 1회 재시도) */
export async function generateNaverBlogContent(
  topic: string,
  tone: Tone,
  guideline: string,
  textProvider: TextProvider = "gemini",
): Promise<string> {
  const bounds = getNaverLengthBounds(guideline);
  let content = await generateBlogText(
    buildNaverPrompt(topic, tone, guideline),
    textProvider,
  );

  if (!isNaverContentTooShort(content, bounds)) {
    return content;
  }

  console.warn(
    `[generate] 네이버 본문 짧음 (${content.length}자), 재생성 — 목표 ${bounds.min}~${bounds.max}자`,
  );

  content = await generateBlogText(
    buildNaverExpandPrompt(topic, tone, guideline, content),
    textProvider,
  );

  if (isNaverContentTooShort(content, bounds)) {
    console.warn(
      `[generate] 네이버 본문 여전히 짧음: ${content.length}자 (목표 ${bounds.min}~${bounds.max}자)`,
    );
  }

  return content;
}
