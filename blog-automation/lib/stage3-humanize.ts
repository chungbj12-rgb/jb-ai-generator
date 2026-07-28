import Anthropic from "@anthropic-ai/sdk";
import { PIPELINE_CONFIG } from "@/blog-automation/lib/config";
import { parseJsonObject } from "@/blog-automation/lib/parse-json";
import { withRetry } from "@/blog-automation/lib/retry";
import type { Stage2Output } from "@/blog-automation/lib/stage2-finalize";

export interface Stage3Output {
  final_body: string;
  edits_made: string[];
}

export interface Stage3Result {
  output: Stage3Output;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: "anthropic";
}

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  return new Anthropic({ apiKey });
}

function buildSystemPrompt(): string {
  return `
역할: 당신은 JB스포츠 배구센터 블로그 글의 마지막 다듬기를 맡은 편집자입니다.
입력된 글은 이미 SEO·구조·사실 관계가 잡혀 있는 완성된 초안입니다. 당신의 임무는 이 글이
"AI가 쓴 티" 없이 사람이 직접 손으로 쓴 것처럼 느껴지도록 문장만 다듬는 것입니다.

무엇을 바꾸는가:
- 문장 길이·리듬에 변화를 준다. 같은 패턴의 문장이 연달아 반복되지 않게 한다.
- 기계적이거나 상투적인 AI 표현("~라고 할 수 있습니다", "결론적으로", "이처럼" 같은 과도한 접속·요약 표현)을 자연스러운 구어체로 바꾼다.
- 문단 사이 흐름이 매끄럽게 이어지도록 접속어·전환을 손본다.
- 실제로 겪은 듯한 자연스러운 뉘앙스(짧은 감탄, 구체적 묘사)를 아주 약간 더한다. 없는 사실을 지어내지 않는다.

무엇을 바꾸지 않는가:
- 사실·통계·연구 내용, 숫자는 절대 바꾸지 않는다.
- 제목, 소제목 구조, (사진: …) 표시, 연락처, CTA 문구의 의미는 유지한다.
- SEO 키워드 배치와 밀도는 유지한다 — 키워드 자체를 빼거나 추가하지 않는다.
- 전체 글자수(공백 포함)는 원문과 비슷한 범위로 유지한다.

출력은 반드시 아래 JSON만:
{
  "final_body": "다듬은 최종 본문",
  "edits_made": ["무엇을 어떻게 자연스럽게 다듬었는지 2~4개 항목"]
}
`.trim();
}

function buildUserPrompt(
  stage2: Stage2Output,
  keyword: string,
  topic: string,
  lengthHint?: string,
): string {
  const base = `키워드: ${keyword}
주제: ${topic}

[다듬을 원문]
${stage2.final_body}

위 글을 사람이 직접 쓴 것처럼 자연스럽게 다듬은 JSON을 반환하세요.`;

  if (!lengthHint) return base;
  return `${base}\n\n${lengthHint}`;
}

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client = getClient();
  const model = PIPELINE_CONFIG.anthropicHumanizeModel;

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    thinking: { type: "disabled" },
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  const text = textBlock?.text?.trim();
  if (!text) throw new Error("Stage 3: Claude가 빈 응답을 반환했습니다.");

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

export async function runStage3Humanize(
  stage2: Stage2Output,
  keyword: string,
  topic: string,
  lengthHint?: string,
): Promise<Stage3Result> {
  const model = PIPELINE_CONFIG.anthropicHumanizeModel;
  const systemPrompt = buildSystemPrompt();

  const execute = async (): Promise<Stage3Result> => {
    const userPrompt = buildUserPrompt(stage2, keyword, topic, lengthHint);
    const { text, inputTokens, outputTokens } = await callClaude(
      systemPrompt,
      userPrompt,
    );
    const parsed = parseJsonObject<Stage3Output>(text);
    const final_body = String(parsed.final_body ?? "").trim();
    if (!final_body) {
      throw new Error("Stage 3: final_body가 비어 있습니다.");
    }
    return {
      output: {
        final_body,
        edits_made: Array.isArray(parsed.edits_made)
          ? parsed.edits_made.map(String)
          : [],
      },
      inputTokens,
      outputTokens,
      model,
      provider: "anthropic",
    };
  };

  return withRetry(execute, 2);
}
