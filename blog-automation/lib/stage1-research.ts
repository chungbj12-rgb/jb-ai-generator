import { GoogleGenAI } from "@google/genai";
import { PIPELINE_CONFIG } from "@/blog-automation/lib/config";
import { parseJsonObject } from "@/blog-automation/lib/parse-json";
import {
  buildStage1DraftPrompt,
  buildStage1FactGatherPrompt,
} from "@/blog-automation/lib/prompt-constants";
import { withRetry } from "@/blog-automation/lib/retry";

export interface ResearchBundle {
  research_summary: string;
  three_main_points: string[];
  studies_and_statistics: string[];
  key_findings: string[];
  source_notes: string[];
}

export interface Stage1Output {
  title_candidates: string[];
  draft_body: string;
  key_facts_used: string[];
  source_notes: string[];
  research_bundle?: ResearchBundle;
}

export interface Stage1Result {
  output: Stage1Output;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: "gemini";
}

const STAGE1_DRAFT_SCHEMA = {
  type: "OBJECT",
  properties: {
    title_candidates: { type: "ARRAY", items: { type: "STRING" } },
    draft_body: { type: "STRING" },
    key_facts_used: { type: "ARRAY", items: { type: "STRING" } },
    source_notes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["title_candidates", "draft_body", "key_facts_used", "source_notes"],
};

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  return new GoogleGenAI({ apiKey });
}

function normalizeResearchBundle(raw: ResearchBundle): ResearchBundle {
  return {
    research_summary: String(raw.research_summary ?? "").trim(),
    three_main_points: Array.isArray(raw.three_main_points)
      ? raw.three_main_points.map(String)
      : [],
    studies_and_statistics: Array.isArray(raw.studies_and_statistics)
      ? raw.studies_and_statistics.map(String)
      : [],
    key_findings: Array.isArray(raw.key_findings)
      ? raw.key_findings.map(String)
      : [],
    source_notes: Array.isArray(raw.source_notes)
      ? raw.source_notes.map(String)
      : [],
  };
}

function normalizeStage1Output(
  raw: Stage1Output,
  bundle: ResearchBundle,
): Stage1Output {
  return {
    title_candidates: Array.isArray(raw.title_candidates)
      ? raw.title_candidates.map(String)
      : [],
    draft_body: String(raw.draft_body ?? "").trim(),
    key_facts_used: Array.isArray(raw.key_facts_used)
      ? raw.key_facts_used.map(String)
      : bundle.key_findings,
    source_notes: Array.isArray(raw.source_notes)
      ? raw.source_notes.map(String)
      : bundle.source_notes,
    research_bundle: bundle,
  };
}

function buildFactGatherUserPrompt(keyword: string, topic: string): string {
  return `키워드: ${keyword}
주제(제목): ${topic}

위 주제에 대해 Google 검색으로 연구·통계·전문 자료를 조사하고 JSON으로 정리하세요.
"N가지 이유" 형식 주제면 three_main_points에 정확히 핵심 이유를 담으세요.`;
}

function buildDraftUserPrompt(
  keyword: string,
  topic: string,
  bundle: ResearchBundle,
): string {
  return `키워드: ${keyword}
주제(제목): ${topic}

[research_bundle — 이 사실만 사용]
${JSON.stringify(bundle, null, 2)}

위 연구·통계 자료만 바탕으로 정보 전달형 블로그 초안 JSON을 작성하세요.`;
}

/** 1-A: Google Search로 연구·통계 수집 */
async function runStage1FactGathering(
  ai: GoogleGenAI,
  model: string,
  keyword: string,
  topic: string,
): Promise<{ bundle: ResearchBundle; inputTokens: number; outputTokens: number }> {
  const execute = async () => {
    const response = await ai.models.generateContent({
      model,
      contents: buildFactGatherUserPrompt(keyword, topic),
      config: {
        systemInstruction: buildStage1FactGatherPrompt(),
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Stage 1-A: 검색·자료 수집 응답이 비어 있습니다.");

    const bundle = normalizeResearchBundle(parseJsonObject<ResearchBundle>(text));
    if (
      !bundle.key_findings.length &&
      !bundle.three_main_points.length &&
      !bundle.studies_and_statistics.length
    ) {
      throw new Error("Stage 1-A: 수집된 연구 자료가 없습니다.");
    }

    const usage = response.usageMetadata;
    return {
      bundle,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  };

  return withRetry(execute, 1);
}

/** 1-B: 수집 자료 기반 정보형 초안 (JSON 모드) */
async function runStage1DraftFromFacts(
  ai: GoogleGenAI,
  model: string,
  keyword: string,
  topic: string,
  bundle: ResearchBundle,
  mergedGuideline: string,
): Promise<{ output: Stage1Output; inputTokens: number; outputTokens: number }> {
  const execute = async () => {
    const response = await ai.models.generateContent({
      model,
      contents: buildDraftUserPrompt(keyword, topic, bundle),
      config: {
        systemInstruction: buildStage1DraftPrompt(mergedGuideline),
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: STAGE1_DRAFT_SCHEMA,
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Stage 1-B: 초안 작성 응답이 비어 있습니다.");

    const parsed = normalizeStage1Output(
      parseJsonObject<Stage1Output>(text),
      bundle,
    );
    if (!parsed.draft_body) {
      throw new Error("Stage 1-B: draft_body가 비어 있습니다.");
    }

    const usage = response.usageMetadata;
    return {
      output: parsed,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  };

  return withRetry(execute, 1);
}

/**
 * Stage 1 전체: Gemini 검색·연구 수집(1-A) → 사실 기반 초안(1-B)
 */
export async function runStage1Research(
  keyword: string,
  topic: string,
  mergedGuideline: string,
): Promise<Stage1Result> {
  const model = PIPELINE_CONFIG.geminiDraftModel;
  const ai = getClient();

  const facts = await runStage1FactGathering(ai, model, keyword, topic);
  const draft = await runStage1DraftFromFacts(
    ai,
    model,
    keyword,
    topic,
    facts.bundle,
    mergedGuideline,
  );

  return {
    output: draft.output,
    inputTokens: facts.inputTokens + draft.inputTokens,
    outputTokens: facts.outputTokens + draft.outputTokens,
    model: `${model}(research+draft)`,
    provider: "gemini",
  };
}
