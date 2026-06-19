import { PIPELINE_CONFIG, calcCostUsd } from "@/blog-automation/lib/config";
import { JB_CTA_RULES, JB_KEYWORD_STRATEGY, JB_SEO_CHECKLIST } from "@/blog-automation/lib/prompt-constants";
import { isBodyLengthValid, lengthAdjustHint } from "@/blog-automation/lib/stage2-finalize";
import { withRetry } from "@/blog-automation/lib/retry";
import { parseJsonObject } from "@/blog-automation/lib/parse-json";
import { JB_CENTER_INFO, JB_SPORTS_BLOG_STYLE_GUIDE } from "@/lib/prompts/jb-sports-blog-guide";
import type { Platform } from "@/types";

export interface ReviseContentInput {
  platform: Platform;
  topic: string;
  keyword?: string;
  currentContent: string;
  feedback: string;
  lengthHint?: string;
}

export interface ReviseContentResult {
  revised_content: string;
  edits_summary: string;
  char_count: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

function buildRevisionSystemPrompt(platform: Platform): string {
  const platformLabel = platform === "naver" ? "네이버 블로그" : "쓰레드";
  const lengthRule =
    platform === "naver"
      ? `공백 포함 ${PIPELINE_CONFIG.minChars}~${PIPELINE_CONFIG.maxChars}자를 유지한다.`
      : "쓰레드 형식에 맞는 간결한 분량을 유지한다.";

  return `
역할: 당신은 JB스포츠 배구센터의 ${platformLabel} 콘텐츠 에디터입니다.
학부모가 생성된 글을 보고 "이 부분을 우리 센터에 맞게 바꿔달라"고 요청하면,
요청 내용을 정확히 반영해 글을 다시 다듬습니다.

센터 핵심 가치: 배구 실력보다 아이의 자존감·자신감·회복탄력성.
원장 정봉진이 9년째 현장 상주, 학부모 신뢰가 최우선 자산.

${JB_SPORTS_BLOG_STYLE_GUIDE}

[SEO 체크리스트 — 네이버인 경우 유지]
${platform === "naver" ? JB_SEO_CHECKLIST : "(쓰레드는 SEO 체크리스트 생략)"}

[키워드 전략]
${JB_KEYWORD_STRATEGY}

[CTA 규칙 — 네이버인 경우 유지]
${platform === "naver" ? JB_CTA_RULES : "(쓰레드는 짧은 마무리)"}

수정 규칙:
1. 사용자 피드백(수정 요청)을 최우선으로 반영한다. 예: "3가지 이유"를 센터 장점 3가지로 교체.
2. 사용자가 제공한 구체 정보(시스템·장점·수치)는 그대로 녹인다. 없는 사실은 만들지 않는다.
3. 수정 요청과 무관한 잘 쓰인 부분은 최대한 유지한다.
4. 문체는 신뢰감 있고 다정한 학부모 대상 어투. 과장 광고 금지.
5. ${lengthRule}
6. 연락처: 글 마지막에 ☎ ${JB_CENTER_INFO.mobile} 안내

출력은 반드시 아래 JSON만:
{
  "revised_content": "...",
  "edits_summary": "무엇을 어떻게 바꿨는지 2~4문장 요약"
}
`.trim();
}

function buildRevisionUserPrompt(input: ReviseContentInput): string {
  const base = `주제/제목: ${input.topic}
${input.keyword ? `키워드: ${input.keyword}\n` : ""}
[현재 글]
${input.currentContent}

[사용자 수정 요청 — 반드시 반영]
${input.feedback}

위 요청에 맞게 글을 수정한 JSON을 반환하세요.`;

  if (!input.lengthHint) return base;
  return `${base}\n\n${input.lengthHint}`;
}

async function callOpenAIRevision(
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
    throw new Error(`글 수정 API 오류 (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      output_tokens?: number;
    };
  };

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI가 빈 응답을 반환했습니다.");

  return {
    text,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens:
      data.usage?.completion_tokens ?? data.usage?.output_tokens ?? 0,
  };
}


export async function reviseContent(
  input: ReviseContentInput,
): Promise<ReviseContentResult> {
  const systemPrompt = buildRevisionSystemPrompt(input.platform);

  const runOnce = async (lengthHint?: string) => {
    const userPrompt = buildRevisionUserPrompt({ ...input, lengthHint });
    const { text, inputTokens, outputTokens } = await callOpenAIRevision(
      systemPrompt,
      userPrompt,
    );
    const parsed = parseJsonObject<{
      revised_content?: string;
      edits_summary?: string;
    }>(text);
    if (!parsed.revised_content?.trim()) {
      throw new Error("수정된 본문이 비어 있습니다.");
    }
    return {
      revised_content: parsed.revised_content.trim(),
      edits_summary:
        parsed.edits_summary?.trim() || "요청하신 내용을 반영해 수정했습니다.",
      inputTokens,
      outputTokens,
    };
  };

  const first = await withRetry(() => runOnce(), 1);
  let revised_content = first.revised_content;
  let totalInput = first.inputTokens;
  let totalOutput = first.outputTokens;

  if (
    input.platform === "naver" &&
    !isBodyLengthValid(revised_content)
  ) {
    const retry = await runOnce(lengthAdjustHint(revised_content));
    revised_content = retry.revised_content;
    totalInput += retry.inputTokens;
    totalOutput += retry.outputTokens;
  }

  const p = PIPELINE_CONFIG.pricing;
  const costUsd = calcCostUsd(
    totalInput,
    totalOutput,
    p.openaiInputPer1M,
    p.openaiOutputPer1M,
  );

  return {
    revised_content,
    edits_summary: first.edits_summary,
    char_count: revised_content.length,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    costUsd,
  };
}
