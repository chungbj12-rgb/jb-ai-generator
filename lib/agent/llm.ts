import { GoogleGenAI } from "@google/genai";
import {
  assertHasApiKey,
  detectTextProvider,
} from "@/lib/agent/config-schema";
import type { AgentModelConfig } from "@/types/agent";

const BLOG_MAX_OUTPUT_TOKENS = 8192;

function resolveGeminiKey(config: AgentModelConfig): string {
  const key = config.geminiApiKey?.trim() || config.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("Gemini API 키가 없습니다.");
  return key;
}

function resolveOpenaiKey(config: AgentModelConfig): string {
  const key = config.openaiApiKey?.trim() || config.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OpenAI API 키가 없습니다.");
  return key;
}

async function generateWithGemini(
  prompt: string,
  model: string,
  config: AgentModelConfig,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: resolveGeminiKey(config) });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      maxOutputTokens: BLOG_MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text?.trim();
  if (!text) throw new Error("Gemini가 빈 응답을 반환했습니다.");
  return text;
}

async function generateWithOpenAI(
  prompt: string,
  model: string,
  config: AgentModelConfig,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolveOpenaiKey(config)}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: BLOG_MAX_OUTPUT_TOKENS,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API 오류: ${err}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI가 빈 응답을 반환했습니다.");
  return text;
}

export async function generateAgentText(
  prompt: string,
  config: AgentModelConfig,
): Promise<string> {
  assertHasApiKey(config);
  const provider = detectTextProvider(config.textModel);

  if (provider === "openai") {
    return generateWithOpenAI(prompt, config.textModel, config);
  }
  return generateWithGemini(prompt, config.textModel, config);
}
