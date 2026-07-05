// Google Gemini API — 서버 사이드 전용
import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-2.5-flash";

/** 짧은 응답(제목 추천, 해시태그 등) */
export const MAX_OUTPUT_TOKENS = 2048;

/** 블로그 본문 — 한글 1500~1800자 + 여유 */
export const BLOG_MAX_OUTPUT_TOKENS = 8192;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export interface GenerateTextOptions {
  maxOutputTokens?: number;
  /** 0 = thinking 비활성 (2.5 Flash) */
  thinkingBudget?: number;
  retries?: number;
}

export interface GeminiImagePart {
  mimeType: string;
  data: string;
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

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { status?: number; message?: string };
  if (err.status && RETRYABLE_STATUS.has(err.status)) return true;
  const msg = String(err.message ?? "");
  return /429|503|overloaded|quota|rate limit|RESOURCE_EXHAUSTED/i.test(msg);
}

function toUserFriendlyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(msg)) {
    return "Gemini API 사용 한도를 초과했습니다. 잠시 후 다시 시도하거나 API 키·요금제를 확인해 주세요.";
  }
  if (/503|overloaded|UNAVAILABLE/i.test(msg)) {
    return "Gemini 서버가 일시적으로 바쁩니다. 잠시 후 다시 시도해 주세요.";
  }
  if (/API key|API_KEY|401|403|PERMISSION_DENIED/i.test(msg)) {
    return "Gemini API 키가 올바르지 않습니다. Vercel 환경변수 GEMINI_API_KEY를 확인해 주세요.";
  }
  if (/GEMINI_API_KEY가 설정되지 않/i.test(msg)) {
    return "GEMINI_API_KEY가 설정되지 않았습니다.";
  }
  return msg || "Gemini API 호출 중 오류가 발생했습니다.";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 단일 프롬프트로 텍스트 생성 (일시 오류 시 재시도) */
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
  const retries = options?.retries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryableError(error)) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  throw new Error(toUserFriendlyError(lastError));
}

/** system + user 메시지로 텍스트 생성 */
export async function generateTextWithSystem(
  systemPrompt: string,
  userPrompt: string,
  options?: GenerateTextOptions,
): Promise<string> {
  const ai = getClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const maxOutputTokens = options?.maxOutputTokens ?? MAX_OUTPUT_TOKENS;
  const thinkingBudget = options?.thinkingBudget ?? 0;
  const retries = options?.retries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          maxOutputTokens,
          thinkingConfig: { thinkingBudget },
          systemInstruction: systemPrompt,
        },
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error("Gemini가 빈 응답을 반환했습니다.");
      }

      return text;
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryableError(error)) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  throw new Error(toUserFriendlyError(lastError));
}

/** system + user + 이미지 멀티모달 생성 */
export async function generateMultimodalText(
  systemPrompt: string,
  userPrompt: string,
  images: GeminiImagePart[],
  options?: GenerateTextOptions,
): Promise<string> {
  const ai = getClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const maxOutputTokens = options?.maxOutputTokens ?? BLOG_MAX_OUTPUT_TOKENS;
  const thinkingBudget = options?.thinkingBudget ?? 0;
  const retries = options?.retries ?? 2;
  let lastError: unknown;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
    [{ text: userPrompt }];
  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data.replace(/^data:[^;]+;base64,/, ""),
      },
    });
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts }],
        config: {
          maxOutputTokens,
          thinkingConfig: { thinkingBudget },
          systemInstruction: systemPrompt,
        },
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error("Gemini가 빈 응답을 반환했습니다.");
      }

      return text;
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryableError(error)) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  throw new Error(toUserFriendlyError(lastError));
}

/** 네이버/쓰레드 블로그 본문 생성용 */
export function generateBlogText(prompt: string): Promise<string> {
  return generateText(prompt, {
    maxOutputTokens: BLOG_MAX_OUTPUT_TOKENS,
    thinkingBudget: 0,
    retries: 2,
  });
}
