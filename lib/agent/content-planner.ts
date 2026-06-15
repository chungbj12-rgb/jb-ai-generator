import { generateAgentText } from "@/lib/agent/llm";
import {
  BLOG_RULES,
  buildFixedRulesSection,
  countBodyChars,
  validateBlogPayload,
} from "@/lib/agent/blog-rules";
import { parseJsonFromText } from "@/lib/agent/parse-json";
import type { AgentModelConfig, AgentPayload, AgentRunConfig, BlogBlock } from "@/types/agent";
import type { Tone } from "@/types";

interface PlannerJson {
  title: string;
  blocks: Array<{
    type: "heading" | "paragraph" | "image";
    content?: string;
    imagePrompt?: string;
    imageAlt?: string;
  }>;
  hashtags?: string[];
}

function countImages(blocks: BlogBlock[]): number {
  return blocks.filter((b) => b.type === "image").length;
}

function buildPlannerPrompt(
  topic: string,
  keyword: string,
  firstSentence: string,
  tone: Tone,
  guideline: string,
  imageCount: number,
  cta: Pick<AgentRunConfig, "ctaText" | "ctaButtonText" | "ctaButtonLink">,
  retryErrors?: string[],
): string {
  const fixedRules = buildFixedRulesSection(topic, keyword, firstSentence, imageCount);

  const retrySection = retryErrors?.length
    ? `
[이전 생성 실패 — 아래 조건을 모두 맞춰 다시 작성]
${retryErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}
`
    : "";

  return `당신은 네이버 블로그 전문 작가입니다. 전문성 있고 신뢰감 있는 글을 JSON으로 설계하세요.

${fixedRules}

[추가 지침]
${guideline || "(없음)"}

[톤]
${tone} — 전문체 기반, 공손하고 대화하듯 (~하십니다/~드립니다)

[CTA 참고 — 마지막 paragraph에 자연스럽게 녹일 것]
- CTA 문구: ${cta.ctaText}
- 버튼 문구: ${cta.ctaButtonText}
- 버튼 링크: ${cta.ctaButtonLink}
${retrySection}
반드시 아래 JSON만 출력 (설명 금지):
{
  "title": "[키워드] + 뒷제목",
  "blocks": [
    { "type": "paragraph", "content": "${firstSentence}..." },
    { "type": "image", "imagePrompt": "english photo prompt", "imageAlt": "한국어 설명" },
    { "type": "heading", "content": "첫 번째, '${keyword}'를 '꼭' 확인하세요" }
  ],
  "hashtags": ["키워드1", "키워드2"]
}`;
}

function buildRetryPrompt(
  topic: string,
  keyword: string,
  firstSentence: string,
  tone: Tone,
  guideline: string,
  imageCount: number,
  cta: Pick<AgentRunConfig, "ctaText" | "ctaButtonText" | "ctaButtonLink">,
  errors: string[],
  previousPayload: AgentPayload,
): string {
  return `${buildPlannerPrompt(topic, keyword, firstSentence, tone, guideline, imageCount, cta, errors)}

[이전 초안 참고 — 조건 미충족, 그대로 쓰지 말고 전면 재작성]
제목: ${previousPayload.title}
본문 글자수: ${countBodyChars(previousPayload.blocks)}자
`;
}

function normalizeBlocks(
  raw: PlannerJson["blocks"],
  cta: Pick<AgentRunConfig, "ctaText" | "ctaButtonText" | "ctaButtonLink">,
  firstSentence: string,
): BlogBlock[] {
  const blocks: BlogBlock[] = raw.map((block, index) => {
    if (block.type === "image") {
      return {
        type: "image" as const,
        imagePrompt: block.imagePrompt?.trim() ?? "",
        imageAlt: block.imageAlt?.trim() ?? "블로그 이미지",
      };
    }
    let content = block.content?.trim() ?? "";
    if (block.type === "paragraph" && index === 0 && !content.startsWith(firstSentence.trim())) {
      content = `${firstSentence.trim()} ${content}`.trim();
    }
    return {
      type: block.type,
      content,
    };
  });

  blocks.push({
    type: "cta",
    ctaText: cta.ctaText,
    ctaButtonText: cta.ctaButtonText,
    ctaButtonLink: cta.ctaButtonLink,
    content: cta.ctaText,
  });

  return blocks;
}

function parsePlannerResponse(
  text: string,
  cta: Pick<AgentRunConfig, "ctaText" | "ctaButtonText" | "ctaButtonLink">,
  firstSentence: string,
): AgentPayload {
  const parsed = parseJsonFromText<PlannerJson>(text);
  if (!parsed?.title || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
    throw new Error("콘텐츠 기획 JSON 파싱에 실패했습니다.");
  }

  const blocks = normalizeBlocks(parsed.blocks, cta, firstSentence);
  const images = countImages(blocks);

  return {
    title: parsed.title.trim(),
    blocks,
    hashtags: (parsed.hashtags ?? [])
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean),
    totalChars: countBodyChars(blocks),
    imageCount: images,
    cta: {
      text: cta.ctaText,
      buttonText: cta.ctaButtonText,
      buttonLink: cta.ctaButtonLink,
    },
  };
}

export interface PlanBlogOptions {
  topic: string;
  keyword: string;
  firstSentence: string;
  tone: Tone;
  guideline: string;
  imageCount?: number;
  cta: Pick<AgentRunConfig, "ctaText" | "ctaButtonText" | "ctaButtonLink">;
  modelConfig: AgentModelConfig;
}

/** 주제 → 구조화된 블로그 초안 (규칙 검증 + 자동 재생성) */
export async function planBlogContent(options: PlanBlogOptions): Promise<AgentPayload> {
  const {
    topic,
    keyword,
    firstSentence,
    tone,
    guideline,
    cta,
    modelConfig,
  } = options;

  const targetImages = Math.min(
    BLOG_RULES.maxImages,
    Math.max(BLOG_RULES.minImages, options.imageCount ?? 7),
  );

  const validationInput = { keyword, firstSentence };
  let lastPayload: AgentPayload | null = null;
  let lastErrors: string[] = [];

  for (let attempt = 1; attempt <= BLOG_RULES.maxRetries; attempt += 1) {
    const prompt =
      attempt === 1 || !lastPayload
        ? buildPlannerPrompt(
            topic,
            keyword,
            firstSentence,
            tone,
            guideline,
            targetImages,
            cta,
          )
        : buildRetryPrompt(
            topic,
            keyword,
            firstSentence,
            tone,
            guideline,
            targetImages,
            cta,
            lastErrors,
            lastPayload,
          );

    const text = await generateAgentText(prompt, modelConfig);
    const payload = parsePlannerResponse(text, cta, firstSentence);
    const errors = validateBlogPayload(payload, validationInput);

    if (errors.length === 0) {
      return payload;
    }

    lastPayload = payload;
    lastErrors = errors;
    console.warn(
      `[content-planner] 규칙 미충족 (${attempt}/${BLOG_RULES.maxRetries}): ${errors.join("; ")}`,
    );
  }

  throw new Error(
    `${BLOG_RULES.maxRetries}회 재생성 후에도 규칙 미충족: ${lastErrors.join(", ")}`,
  );
}
