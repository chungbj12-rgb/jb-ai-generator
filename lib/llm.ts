// 통합 텍스트 생성 — Gemini / OpenAI
import {
  generateBlogText as generateGeminiBlogText,
  generateText as generateGeminiText,
  generateTextWithSystem as generateGeminiTextWithSystem,
  isGeminiConfigured,
} from "@/lib/gemini";

export type TextProvider = "gemini" | "openai";

export const OPENAI_TEXT_MODEL = "gpt-5.4";

export const TEXT_PROVIDER_OPTIONS: {
  id: TextProvider;
  label: string;
  description: string;
}[] = [
  { id: "gemini", label: "Gemini", description: "Google Gemini 2.5 Flash" },
  { id: "openai", label: "ChatGPT", description: "OpenAI GPT-5.4" },
];

const OPENAI_BLOG_MAX_COMPLETION_TOKENS = 8192;
const OPENAI_SHORT_MAX_COMPLETION_TOKENS = 2048;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim();
}

export function isProviderConfigured(provider: TextProvider): boolean {
  return provider === "gemini" ? isGeminiConfigured() : isOpenAIConfigured();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatOpenAIError(status: number, body: string): string {
  if (status === 401) return "OpenAI API 키가 올바르지 않습니다.";
  if (status === 403) return "OpenAI API 권한이 없습니다. 결제·조직 설정을 확인해 주세요.";
  if (status === 429) return "OpenAI API 사용 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  return `OpenAI API 오류 (${status}): ${body.slice(0, 150)}`;
}

async function callOpenAI(
  prompt: string,
  maxCompletionTokens: number,
): Promise<string> {
  return callOpenAIWithMessages(
    [{ role: "user", content: prompt }],
    maxCompletionTokens,
  );
}

async function callOpenAIWithMessages(
  messages: Array<{ role: "system" | "user"; content: string }>,
  maxCompletionTokens: number,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");

  let lastError = "";

  for (let attempt = 0; attempt <= 2; attempt++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_TEXT_MODEL,
        messages,
        max_completion_tokens: maxCompletionTokens,
        reasoning_effort: "none",
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("OpenAI가 빈 응답을 반환했습니다.");
      return text;
    }

    lastError = formatOpenAIError(res.status, await res.text());
    if (RETRYABLE.has(res.status) && attempt < 2) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    break;
  }

  throw new Error(lastError);
}

/** 짧은 응답 (제목 추천, 해시태그) */
export async function generateShortText(
  prompt: string,
  provider: TextProvider = "gemini",
): Promise<string> {
  if (provider === "openai") {
    return callOpenAI(prompt, OPENAI_SHORT_MAX_COMPLETION_TOKENS);
  }
  return generateGeminiText(prompt);
}

/** 블로그 본문 생성 */
export async function generateBlogText(
  prompt: string,
  provider: TextProvider = "gemini",
): Promise<string> {
  if (provider === "openai") {
    return callOpenAI(prompt, OPENAI_BLOG_MAX_COMPLETION_TOKENS);
  }
  return generateGeminiBlogText(prompt);
}

/** 쓰레드 — system 프롬프트 분리 생성 */
export async function generateThreadText(
  systemPrompt: string,
  userPrompt: string,
  provider: TextProvider = "gemini",
): Promise<string> {
  if (provider === "openai") {
    return callOpenAIWithMessages(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      OPENAI_SHORT_MAX_COMPLETION_TOKENS,
    );
  }
  return generateGeminiTextWithSystem(systemPrompt, userPrompt, {
    maxOutputTokens: OPENAI_SHORT_MAX_COMPLETION_TOKENS,
    thinkingBudget: 0,
    retries: 2,
  });
}
