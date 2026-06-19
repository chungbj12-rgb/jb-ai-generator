import { GoogleGenAI } from "@google/genai";
import { PIPELINE_CONFIG } from "@/blog-automation/lib/config";
import { parseJsonObject } from "@/blog-automation/lib/parse-json";
import { buildStage1SystemPrompt } from "@/blog-automation/lib/prompt-constants";
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

/** Gemini structured output 스키마 (googleSearch와 동시 사용 불가 → JSON 모드 우선) */
const STAGE1_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title_candidates: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    draft_body: { type: "STRING" },
    key_facts_used: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    source_notes: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["title_candidates", "draft_body", "key_facts_used", "source_notes"],
};

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  return new GoogleGenAI({ apiKey });
}

function buildUserPrompt(keyword: string, topic: string): string {
  return `키워드: ${keyword}
주제(제목 방향): ${topic}

위 키워드·주제로 자료를 정리한 뒤, 지정된 JSON 스키마에 맞춰 블로그 초안을 작성하세요.
다른 텍스트 없이 JSON만 출력하세요.`;
}

function normalizeStage1Output(raw: Stage1Output): Stage1Output {
  return {
    title_candidates: Array.isArray(raw.title_candidates)
      ? raw.title_candidates.map(String)
      : [],
    draft_body: String(raw.draft_body ?? "").trim(),
    key_facts_used: Array.isArray(raw.key_facts_used)
      ? raw.key_facts_used.map(String)
      : [],
    source_notes: Array.isArray(raw.source_notes)
      ? raw.source_notes.map(String)
      : [],
  };
}

export async function runStage1Research(
  keyword: string,
  topic: string,
  mergedGuideline: string,
): Promise<Stage1Result> {
  const model = PIPELINE_CONFIG.geminiDraftModel;
  const ai = getClient();
  const systemInstruction = buildStage1SystemPrompt(mergedGuideline);

  const execute = async (): Promise<Stage1Result> => {
    const response = await ai.models.generateContent({
      model,
      contents: buildUserPrompt(keyword, topic),
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: STAGE1_RESPONSE_SCHEMA,
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Stage 1: Gemini가 빈 응답을 반환했습니다.");

    const output = normalizeStage1Output(parseJsonObject<Stage1Output>(text));
    if (!output.draft_body) {
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

  return withRetry(execute, 1);
}
