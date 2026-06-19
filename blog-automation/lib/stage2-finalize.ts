import { PIPELINE_CONFIG } from "@/blog-automation/lib/config";
import { parseJsonObject } from "@/blog-automation/lib/parse-json";
import { buildStage2SystemPrompt } from "@/blog-automation/lib/prompt-constants";
import { withRetry } from "@/blog-automation/lib/retry";
import type { Stage1Output } from "@/blog-automation/lib/stage1-research";

export interface Stage2Output {
  title: string;
  final_body: string;
  seo_checklist_result: Record<string, string>;
  edits_made: string[];
}

export interface Stage2Result {
  output: Stage2Output;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: "openai";
}

function buildUserPrompt(
  stage1: Stage1Output,
  keyword: string,
  topic: string,
  lengthHint?: string,
  customCta?: string,
): string {
  const researchBlock = stage1.research_bundle
    ? `[research_bundle — Gemini가 검색·수집한 연구·통계 (사실 유지 필수)]
${JSON.stringify(stage1.research_bundle, null, 2)}

`
    : "";

  const base = `키워드: ${keyword}
주제: ${topic}

${researchBlock}[Stage1 draft_body — 정보형 초안]
${stage1.draft_body}

[key_facts_used]
${JSON.stringify(stage1.key_facts_used, null, 2)}

[source_notes]
${JSON.stringify(stage1.source_notes, null, 2)}

[title_candidates]
${JSON.stringify(stage1.title_candidates, null, 2)}

위 자료조사 기반 초안을 JB스포츠가 직접 쓴 것처럼 정돈하여 최종 JSON으로 반환하세요.
연구·통계 사실은 유지하고, 어투·구조·공감·SEO·CTA만 다듬으세요.${
    customCta
      ? `

[사용자 지정 CTA — 본문 마무리에 반드시 반영]
${customCta}`
      : ""
  }`;

  if (!lengthHint) return base;
  return `${base}

${lengthHint}`;
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");

  const model = PIPELINE_CONFIG.openaiFinalModel;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 8192,
      reasoning_effort: "none",
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stage 2 OpenAI 오류 (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Stage 2: OpenAI가 빈 응답을 반환했습니다.");

  return {
    text,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

export async function runStage2Finalize(
  stage1: Stage1Output,
  keyword: string,
  topic: string,
  mergedGuideline: string,
  lengthHint?: string,
  customCta?: string,
): Promise<Stage2Result> {
  const model = PIPELINE_CONFIG.openaiFinalModel;
  const systemPrompt = buildStage2SystemPrompt(mergedGuideline);
  const userPrompt = buildUserPrompt(stage1, keyword, topic, lengthHint, customCta);

  const execute = async (): Promise<Stage2Result> => {
    const { text, inputTokens, outputTokens } = await callOpenAI(
      systemPrompt,
      userPrompt,
    );
    const output = parseJsonObject<Stage2Output>(text);
    const normalized: Stage2Output = {
      title: String(output.title ?? topic).trim(),
      final_body: String(output.final_body ?? "").trim(),
      seo_checklist_result: output.seo_checklist_result ?? {},
      edits_made: Array.isArray(output.edits_made)
        ? output.edits_made.map(String)
        : [],
    };
    if (!normalized.final_body) {
      throw new Error("Stage 2: final_body가 비어 있습니다.");
    }
    return {
      output: normalized,
      inputTokens,
      outputTokens,
      model,
      provider: "openai",
    };
  };

  return withRetry(execute, 1);
}

export function isBodyLengthValid(body: string): boolean {
  const len = body.length;
  return len >= PIPELINE_CONFIG.minChars && len <= PIPELINE_CONFIG.maxChars;
}

export function lengthAdjustHint(body: string): string {
  const len = body.length;
  return `이전 응답의 final_body 글자수가 ${len}자로 ${PIPELINE_CONFIG.minChars}~${PIPELINE_CONFIG.maxChars}자 범위를 벗어났습니다. 반드시 ${PIPELINE_CONFIG.minChars}~${PIPELINE_CONFIG.maxChars}자(공백 포함)로 조정하세요.`;
}
