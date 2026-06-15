import { generateAgentText } from "@/lib/agent/llm";
import { getNaverLengthBounds } from "@/lib/naver-length";
import { parseJsonFromText } from "@/lib/agent/parse-json";
import type { AgentModelConfig, AgentPayload, AgentRunConfig, BlogBlock } from "@/types/agent";
import type { Tone } from "@/types";

const MIN_IMAGES = 6;
const MAX_IMAGES = 8;

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

function countTextChars(blocks: BlogBlock[]): number {
  return blocks
    .filter((b) => b.type === "heading" || b.type === "paragraph" || b.type === "cta")
    .reduce((sum, b) => sum + (b.content?.length ?? 0) + (b.ctaText?.length ?? 0), 0);
}

function buildPlannerPrompt(
  topic: string,
  tone: Tone,
  guideline: string,
  imageCount: number,
  cta: Pick<AgentRunConfig, "ctaText" | "ctaButtonText" | "ctaButtonLink">,
): string {
  const bounds = getNaverLengthBounds(guideline);

  return `당신은 네이버 블로그 자동화 에이전트의 콘텐츠 기획자입니다.
주제에 맞는 네이버 블로그 초안을 JSON으로 설계하세요.

[주제]
${topic}

[톤]
${tone}

[CTA — 본문 마지막에 반영]
- CTA 문구: ${cta.ctaText}
- 버튼 문구: ${cta.ctaButtonText}
- 버튼 링크: ${cta.ctaButtonLink}

[지침]
${guideline}

[필수 규칙]
1. 본문 텍스트(heading+paragraph) 합계 ${bounds.min}~${bounds.max}자
2. image 블록 정확히 ${imageCount}개 — 문단 사이사이에 자연스럽게 배치 (연속 2개 image 금지)
3. image 블록마다 imagePrompt(영문, 사진 스타일)와 imageAlt(한국어) 작성
4. 서론·본문(소제목 3~5개)·마무리 구조
5. 마지막 paragraph에서 CTA 문구를 자연스럽게 녹여 쓸 것
6. hashtags 10개 (# 없이)

반드시 아래 JSON만 출력:
{
  "title": "블로그 제목",
  "blocks": [
    { "type": "paragraph", "content": "..." },
    { "type": "image", "imagePrompt": "...", "imageAlt": "..." },
    { "type": "heading", "content": "소제목" }
  ],
  "hashtags": ["키워드1"]
}`;
}

function normalizeBlocks(
  raw: PlannerJson["blocks"],
  cta: Pick<AgentRunConfig, "ctaText" | "ctaButtonText" | "ctaButtonLink">,
): BlogBlock[] {
  const blocks: BlogBlock[] = raw.map((block) => {
    if (block.type === "image") {
      return {
        type: "image" as const,
        imagePrompt: block.imagePrompt?.trim() ?? "",
        imageAlt: block.imageAlt?.trim() ?? "블로그 이미지",
      };
    }
    return {
      type: block.type,
      content: block.content?.trim() ?? "",
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

export interface PlanBlogOptions {
  topic: string;
  tone: Tone;
  guideline: string;
  imageCount?: number;
  cta: Pick<AgentRunConfig, "ctaText" | "ctaButtonText" | "ctaButtonLink">;
  modelConfig: AgentModelConfig;
}

/** 주제 → 구조화된 블로그 초안 (이미지 슬롯 + CTA 포함) */
export async function planBlogContent(options: PlanBlogOptions): Promise<AgentPayload> {
  const { topic, tone, guideline, cta, modelConfig } = options;
  const targetImages = Math.min(
    MAX_IMAGES,
    Math.max(MIN_IMAGES, options.imageCount ?? 7),
  );

  const text = await generateAgentText(
    buildPlannerPrompt(topic, tone, guideline, targetImages, cta),
    modelConfig,
  );

  const parsed = parseJsonFromText<PlannerJson>(text);
  if (!parsed?.title || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
    throw new Error("콘텐츠 기획 JSON 파싱에 실패했습니다.");
  }

  const blocks = normalizeBlocks(parsed.blocks, cta);
  const images = countImages(blocks);

  if (images < MIN_IMAGES || images > MAX_IMAGES) {
    throw new Error(
      `이미지 블록 수가 ${images}개입니다. ${MIN_IMAGES}~${MAX_IMAGES}개가 필요합니다.`,
    );
  }

  return {
    title: parsed.title.trim(),
    blocks,
    hashtags: (parsed.hashtags ?? []).map((t) => t.replace(/^#/, "").trim()).filter(Boolean),
    totalChars: countTextChars(blocks),
    imageCount: images,
    cta: {
      text: cta.ctaText,
      buttonText: cta.ctaButtonText,
      buttonLink: cta.ctaButtonLink,
    },
  };
}
