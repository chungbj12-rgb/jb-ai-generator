// Google Gemini API — 서버 사이드 전용
import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-2.5-flash";
export const MAX_OUTPUT_TOKENS = 2048;

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
export async function generateText(prompt: string): Promise<string> {
  const ai = getClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini가 빈 응답을 반환했습니다.");
  }

  return text;
}

/** JSON 형식 응답 요청 (주제 추천 등) */
export async function generateJson(prompt: string): Promise<string> {
  const ai = getClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini가 빈 응답을 반환했습니다.");
  }

  return text;
}
