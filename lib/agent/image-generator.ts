import fs from "fs/promises";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import {
  assertHasApiKey,
  detectImageProvider,
} from "@/lib/agent/config-schema";
import type { AgentModelConfig, AgentPayload, BlogBlock } from "@/types/agent";

function resolveGeminiKey(config: AgentModelConfig): string {
  const key = config.geminiApiKey?.trim() || config.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("Gemini API 키가 없습니다.");
  return key;
}

function resolveOpenaiKey(config: AgentModelConfig): string {
  const key = config.openaiApiKey?.trim() || config.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OpenAI API 키가 없습니다.");
  return key;
}

async function generateGeminiImage(
  prompt: string,
  model: string,
  config: AgentModelConfig,
): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: resolveGeminiKey(config) });
  const response = await ai.models.generateImages({
    model,
    prompt: `${prompt}. High quality blog photo, natural lighting, no text overlay, no watermark.`,
    config: { numberOfImages: 1, aspectRatio: "16:9" },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("Gemini 이미지 생성 실패");
  return Buffer.from(imageBytes, "base64");
}

async function generateOpenAIImage(
  prompt: string,
  model: string,
  config: AgentModelConfig,
): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolveOpenaiKey(config)}`,
    },
    body: JSON.stringify({
      model,
      prompt: `${prompt}. High quality blog photo, natural lighting, no text overlay, no watermark.`,
      n: 1,
      size: "1792x1024",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI 이미지 API 오류: ${err}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const item = data.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item?.url) {
    const imgRes = await fetch(item.url);
    return Buffer.from(await imgRes.arrayBuffer());
  }
  throw new Error("OpenAI 이미지 생성 실패");
}

/** 블록별 이미지 생성 → outputDir 저장 */
export async function generateBlockImages(
  payload: AgentPayload,
  outputDir: string,
  modelConfig: AgentModelConfig,
): Promise<AgentPayload> {
  assertHasApiKey(modelConfig);
  await fs.mkdir(outputDir, { recursive: true });

  const provider = detectImageProvider(modelConfig.imageModel);
  const blocks: BlogBlock[] = [];
  let imageIndex = 0;

  for (const block of payload.blocks) {
    if (block.type !== "image") {
      blocks.push(block);
      continue;
    }

    if (!block.imagePrompt) {
      throw new Error("image 블록에 imagePrompt가 없습니다.");
    }

    imageIndex += 1;
    const fileName = `image-${String(imageIndex).padStart(2, "0")}.png`;
    const filePath = path.join(outputDir, fileName);

    const buffer =
      provider === "openai"
        ? await generateOpenAIImage(block.imagePrompt, modelConfig.imageModel, modelConfig)
        : await generateGeminiImage(block.imagePrompt, modelConfig.imageModel, modelConfig);

    await fs.writeFile(filePath, buffer);
    blocks.push({ ...block, imagePath: filePath });
  }

  return { ...payload, blocks };
}
