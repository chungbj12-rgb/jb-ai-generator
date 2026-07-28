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
  if (!apiKey) throw new Error("GEMINI_API_KEY媛 ?ㅼ젙?섏? ?딆븯?듬땲??");
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
  return `?ㅼ썙?? ${keyword}
二쇱젣(?쒕ぉ): ${topic}

??二쇱젣?????Google 寃?됱쑝濡??곌뎄쨌?듦퀎쨌?꾨Ц ?먮즺瑜?議곗궗?섍퀬 JSON?쇰줈 ?뺣━?섏꽭??
"N媛吏 ?댁쑀" ?뺤떇 二쇱젣硫?three_main_points???뺥솗???듭떖 ?댁쑀瑜??댁쑝?몄슂.`;
}

function buildDraftUserPrompt(
  keyword: string,
  topic: string,
  bundle: ResearchBundle,
): string {
  return `?ㅼ썙?? ${keyword}
二쇱젣(?쒕ぉ): ${topic}

[research_bundle ?????ъ떎留??ъ슜]
${JSON.stringify(bundle, null, 2)}

???곌뎄쨌?듦퀎 ?먮즺留?諛뷀깢?쇰줈 ?뺣낫 ?꾨떖??釉붾줈洹?珥덉븞 JSON???묒꽦?섏꽭??`;
}

/** 1-A: Google Search濡??곌뎄쨌?듦퀎 ?섏쭛 */
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
    if (!text) throw new Error("Stage 1-A: 寃?됀룹옄猷??섏쭛 ?묐떟??鍮꾩뼱 ?덉뒿?덈떎.");

    const bundle = normalizeResearchBundle(parseJsonObject<ResearchBundle>(text));
    if (
      !bundle.key_findings.length &&
      !bundle.three_main_points.length &&
      !bundle.studies_and_statistics.length
    ) {
      throw new Error("Stage 1-A: ?섏쭛???곌뎄 ?먮즺媛 ?놁뒿?덈떎.");
    }

    const usage = response.usageMetadata;
    return {
      bundle,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  };

  return withRetry(execute, 4);
}

/** 1-B: ?섏쭛 ?먮즺 湲곕컲 ?뺣낫??珥덉븞 (JSON 紐⑤뱶) */
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
    if (!text) throw new Error("Stage 1-B: 珥덉븞 ?묒꽦 ?묐떟??鍮꾩뼱 ?덉뒿?덈떎.");

    const parsed = normalizeStage1Output(
      parseJsonObject<Stage1Output>(text),
      bundle,
    );
    if (!parsed.draft_body) {
      throw new Error("Stage 1-B: draft_body媛 鍮꾩뼱 ?덉뒿?덈떎.");
    }

    const usage = response.usageMetadata;
    return {
      output: parsed,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  };

  return withRetry(execute, 4);
}

/**
 * Stage 1 ?꾩껜: Gemini 寃?됀룹뿰援??섏쭛(1-A) ???ъ떎 湲곕컲 珥덉븞(1-B)
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


