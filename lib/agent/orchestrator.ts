import fs from "fs/promises";
import path from "path";
import { planBlogContent } from "@/lib/agent/content-planner";
import { generateBlockImages } from "@/lib/agent/image-generator";
import type { AgentModelConfig, AgentPayload, AgentRunConfig } from "@/types/agent";
import type { Tone } from "@/types";

export interface PrepareOptions {
  config: AgentRunConfig;
  guideline: string;
  tone: Tone;
  outputDir: string;
  withImages?: boolean;
}

export interface PrepareResult {
  payload: AgentPayload;
  outputDir: string;
  manifestPath: string;
}

function toModelConfig(config: AgentRunConfig): AgentModelConfig {
  return {
    textModel: config.textModel,
    imageModel: config.imageModel,
    apiKey: config.apiKey,
    geminiApiKey: config.geminiApiKey,
    openaiApiKey: config.openaiApiKey,
  };
}

/** 콘텐츠 기획 (+ 선택적 이미지 생성) → manifest 저장 */
export async function prepareAgentJob(
  options: PrepareOptions,
): Promise<PrepareResult> {
  const { config, guideline, tone, outputDir, withImages = true } = options;
  const modelConfig = toModelConfig(config);

  await fs.mkdir(outputDir, { recursive: true });

  let payload = await planBlogContent({
    topic: config.topic,
    keyword: config.keyword,
    firstSentence: config.firstSentence,
    tone,
    guideline,
    imageCount: config.imageCount,
    cta: config,
    modelConfig,
  });

  if (withImages) {
    payload = await generateBlockImages(
      payload,
      path.join(outputDir, "images"),
      modelConfig,
    );
  }

  const manifestPath = path.join(outputDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(payload, null, 2), "utf-8");

  return { payload, outputDir, manifestPath };
}

export async function loadManifest(manifestPath: string): Promise<AgentPayload> {
  const raw = await fs.readFile(manifestPath, "utf-8");
  return JSON.parse(raw) as AgentPayload;
}
