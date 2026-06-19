// AI 제목/주제 추천 — JB스포츠 배구 전용
import { NextRequest, NextResponse } from "next/server";
import { isGeminiConfigured } from "@/lib/gemini";
import { generateShortText, isProviderConfigured } from "@/lib/llm";
import type { TextProvider } from "@/lib/llm";
import {
  buildJbNaverFallbackTitles,
  buildJbThreadFallbackTopics,
  buildNaverTitleSuggestPrompt,
  buildThreadTopicSuggestPrompt,
  isVolleyballRelatedText,
} from "@/lib/prompts/jb-content-rules";
import { parseTopicsFromText } from "@/lib/parse-topics";
import { Platform } from "@/types";

export const maxDuration = 60;

function filterVolleyballTopics(
  topics: string[],
  keyword: string,
  limit: number,
): string[] {
  const related = topics.filter((t) => isVolleyballRelatedText(t, keyword));
  if (related.length >= Math.min(3, limit)) {
    return related.slice(0, limit);
  }
  // 관련 제목이 너무 적으면 폴백과 병합
  const fallback =
    limit >= 10
      ? buildJbNaverFallbackTitles(keyword)
      : buildJbThreadFallbackTopics(keyword);
  const merged = [...new Set([...related, ...fallback])];
  return merged.slice(0, limit);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = String(body.keyword ?? "").trim();
    const platform: Platform =
      body.platform === "thread" ? "thread" : "naver";
    const textProvider: TextProvider =
      body.textProvider === "openai" ? "openai" : "gemini";

    if (!keyword) {
      return NextResponse.json(
        { error: "키워드를 입력해 주세요. (예: 용인배구학원, 수지배구레슨)" },
        { status: 400 },
      );
    }

    const limit = platform === "naver" ? 10 : 5;
    const mock =
      platform === "naver"
        ? buildJbNaverFallbackTitles(keyword)
        : buildJbThreadFallbackTopics(keyword);

    if (!isProviderConfigured(textProvider) && !isGeminiConfigured()) {
      return NextResponse.json({
        topics: mock,
        platform,
        fallback: true,
        warning: "AI API 키가 없어 JB스포츠 기본 제목을 사용했습니다.",
      });
    }

    const provider = isProviderConfigured(textProvider) ? textProvider : "gemini";
    const prompt =
      platform === "naver"
        ? buildNaverTitleSuggestPrompt(keyword)
        : buildThreadTopicSuggestPrompt(keyword);

    try {
      const text = await generateShortText(prompt, provider);
      const parsed = parseTopicsFromText(text, limit);
      const topics = parsed?.length
        ? filterVolleyballTopics(parsed, keyword, limit)
        : mock;

      return NextResponse.json({
        topics,
        platform,
        ...(parsed?.length ? {} : { fallback: true, warning: "AI 파싱 실패 — JB스포츠 기본 제목 사용" }),
      });
    } catch (aiError) {
      console.error("주제 추천 AI 오류:", aiError);
      const message =
        aiError instanceof Error
          ? aiError.message
          : "제목 추천 중 오류가 발생했습니다.";

      return NextResponse.json({
        topics: mock,
        platform,
        fallback: true,
        warning: `${message} JB스포츠 기본 제목을 표시합니다.`,
      });
    }
  } catch (error) {
    console.error("주제 추천 오류:", error);
    return NextResponse.json(
      { error: "주제 추천 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
