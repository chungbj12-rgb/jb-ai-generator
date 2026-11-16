import { PIPELINE_CONFIG } from "@/blog-automation/lib/config";
import { parseJsonObject } from "@/blog-automation/lib/parse-json";
import { buildStage3SystemPrompt } from "@/blog-automation/lib/prompt-constants";
import { withRetry } from "@/blog-automation/lib/retry";
import type { Stage1Output } from "@/blog-automation/lib/stage1-research";
import type { Stage2Output } from "@/blog-automation/lib/stage2-finalize";
import { callClaudeMessages } from "@/lib/anthropic";

export interface Stage3Output {
  title: string;
  final_body: string;
  humanizing_edits: string[];
}

export interface Stage3Result {
  output: Stage3Output;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: "anthropic";
}

function buildUserPrompt(
  stage1: Stage1Output,
  stage2: Stage2Output,
  keyword: string,
  topic: string,
  lengthHint?: string,
): string {
  const base = `키워드: ${keyword}
주제: ${topic}

[key_facts_used — 반드시 유지]
${JSON.stringify(stage1.key_facts_used, null, 2)}

[Stage2 GPT 정돈본 — 이 내용을 바탕으로 3단계 윤문]
제목: ${stage2.title}

${stage2.final_body}

위 글을 정봉진 대표가 직접 쓴 것처럼 마지막 윤문하세요.
사실·구조·SEO·CTA는 그대로 두고, AI 티만 제거하세요.`;

  if (!lengthHint) return base;
  return `${base}

${lengthHint}`;
}

export async function runStage3Humanize(
  stage1: Stage1Output,
  stage2: Stage2Output,
  keyword: string,
  topic: string,
  mergedGuideline: string,
  lengthHint?: string,
): Promise<Stage3Result> {
  const model = PIPELINE_CONFIG.claudeHumanizeModel;
  const systemPrompt = buildStage3SystemPrompt(mergedGuideline);
  const userPrompt = buildUserPrompt(
    stage1,
    stage2,
    keyword,
    topic,
    lengthHint,
  );

  const execute = async (): Promise<Stage3Result> => {
    const { text, inputTokens, outputTokens } = await callClaudeMessages(
      systemPrompt,
      userPrompt,
      model,
    );
    const output = parseJsonObject<Stage3Output>(text);
    const normalized: Stage3Output = {
      title: String(output.title ?? stage2.title).trim(),
      final_body: String(output.final_body ?? "").trim(),
      humanizing_edits: Array.isArray(output.humanizing_edits)
        ? output.humanizing_edits.map(String)
        : [],
    };
    if (!normalized.final_body) {
      throw new Error("Stage 3: final_body가 비어 있습니다.");
    }
    return {
      output: normalized,
      inputTokens,
      outputTokens,
      model,
      provider: "anthropic",
    };
  };

  return withRetry(execute, 1);
}
