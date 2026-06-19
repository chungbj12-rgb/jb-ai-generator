import { GoogleGenAI } from "@google/genai";
import { PIPELINE_CONFIG } from "@/blog-automation/lib/config";
import { parseJsonObject } from "@/blog-automation/lib/parse-json";
import { STAGE1_SYSTEM_PROMPT } from "@/blog-automation/lib/prompt-constants";
import { withRetry } from "@/blog-automation/lib/retry";

export interface Stage1Output {
  title_candidates: string[];
  draft_body: string;
  key_facts_used: string[];
  source_notes: string[];
}

export interface Stage1Result {
  output: Stage1Output;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: "gemini";
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  return new GoogleGenAI({ apiKey });
}

function buildUserPrompt(keyword: string, topic: string): string {
  return `키워드: ${keyword}
주제(제목 방향): ${topic}

위 키워드·주제로 자료조사 후 블로그 초안 JSON을 작성하세요.`;
}

export async function runStage1Research(
  keyword: string,
  topic: string,
): Promise<Stage1Result> {
  const model = PIPELINE_CONFIG.geminiDraftModel;
  const ai = getClient();

  const execute = async (): Promise<Stage1Result> => {
    const response = await ai.models.generateContent({
      model,
      contents: buildUserPrompt(keyword, topic),
      config: {
        systemInstruction: STAGE1_SYSTEM_PROMPT,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
        // Google Search grounding — 사실 기반 자료조사
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Stage 1: Gemini가 빈 응답을 반환했습니다.");

    const output = parseJsonObject<Stage1Output>(text);
    if (!output.draft_body?.trim()) {
      throw new Error("Stage 1: draft_body가 비어 있습니다.");
    }

    const usage = response.usageMetadata;
    return {
      output,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      model,
      provider: "gemini",
    };
  };

  const result = await withRetry(execute, 1);
  return result;
}
