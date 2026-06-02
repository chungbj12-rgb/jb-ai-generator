// Google Gemini API — 서버 사이드 전용
import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-2.5-flash";

/** 짧은 응답(제목 추천, 해시태그 등) */
export const MAX_OUTPUT_TOKENS = 2048;

/** 블로그 본문 — 한글 1500~1800자 + 여유 */
export const BLOG_MAX_OUTPUT_TOKENS = 8192;

export interface GenerateTextOptions {
  maxOutputTokens?: number;
  /**
   * 0 = thinking 비활성 (2.5 Flash).
   * thinking 토큰이 maxOutputTokens에 포함되면 본문이 잘리므로 블로그 생성은 0 고정.
   */
  thinkingBudget?: number;
}

/** GEMINI_API_KEY 설정 여부 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
}

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

/** 단일 프롬프트로 텍스트 생성 */
export async function generateText(
  prompt: string,
  options?: GenerateTextOptions,
): Promise<string> {
  const ai = getClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const maxOutputTokens = options?.maxOutputTokens ?? MAX_OUTPUT_TOKENS;
  const thinkingBudget = options?.thinkingBudget ?? 0;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      maxOutputTokens,
      thinkingConfig: { thinkingBudget },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini가 빈 응답을 반환했습니다.");
  }

  return text;
}

/** 네이버/쓰레드 블로그 본문 생성용 (thinking off, 충분한 출력 한도) */
export function generateBlogText(prompt: string): Promise<string> {
  return generateText(prompt, {
    maxOutputTokens: BLOG_MAX_OUTPUT_TOKENS,
    thinkingBudget: 0,
  });
}
