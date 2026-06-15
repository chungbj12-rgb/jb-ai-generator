import fs from "fs/promises";
import path from "path";
import {
  agentRunConfigSchema,
  type AgentRunConfigInput,
} from "@/lib/agent/config-schema";
import type { AgentRunConfig } from "@/types/agent";
import type { Tone } from "@/types";

const DEFAULTS: Partial<AgentRunConfig> = {
  textModel: "gemini-2.5-flash",
  imageModel: "imagen-4.0-generate-001",
  tone: "friendly",
  imageCount: 7,
};

/** 환경변수에서 부분 설정 로드 */
export function loadConfigFromEnv(): Partial<AgentRunConfig> {
  const partial: Partial<AgentRunConfig> = { ...DEFAULTS };

  const assign = <K extends keyof AgentRunConfig>(key: K, value: string | undefined) => {
    if (value !== undefined && value !== "") {
      partial[key] = value as AgentRunConfig[K];
    }
  };

  assign("naverId", process.env.NAVER_ID);
  assign("naverPassword", process.env.NAVER_PASSWORD);
  assign("blogId", process.env.NAVER_BLOG_ID);
  assign("topic", process.env.AGENT_TOPIC);
  assign("ctaText", process.env.AGENT_CTA_TEXT);
  assign("ctaButtonText", process.env.AGENT_CTA_BUTTON_TEXT);
  assign("ctaButtonLink", process.env.AGENT_CTA_BUTTON_LINK);
  assign("textModel", process.env.AGENT_TEXT_MODEL);
  assign("imageModel", process.env.AGENT_IMAGE_MODEL);
  assign("apiKey", process.env.AGENT_API_KEY);
  assign("geminiApiKey", process.env.GEMINI_API_KEY);
  assign("openaiApiKey", process.env.OPENAI_API_KEY);

  if (process.env.AGENT_TONE) {
    partial.tone = process.env.AGENT_TONE as Tone;
  }
  if (process.env.AGENT_IMAGE_COUNT) {
    partial.imageCount = Number(process.env.AGENT_IMAGE_COUNT);
  }

  return partial;
}

/** agent.config.json 로드 */
export async function loadConfigFile(
  filePath: string,
): Promise<Partial<AgentRunConfig>> {
  const absolute = path.resolve(filePath);
  const raw = await fs.readFile(absolute, "utf-8");
  return JSON.parse(raw) as Partial<AgentRunConfig>;
}

/** env + 파일 + CLI 오버라이드 병합 후 검증 */
export async function resolveAgentConfig(options?: {
  configPath?: string;
  overrides?: Partial<AgentRunConfig>;
}): Promise<AgentRunConfig> {
  const merged: Partial<AgentRunConfig> = {
    ...DEFAULTS,
    ...loadConfigFromEnv(),
  };

  if (options?.configPath) {
    Object.assign(merged, await loadConfigFile(options.configPath));
  }

  if (options?.overrides) {
    Object.assign(merged, options.overrides);
  }

  const parsed = agentRunConfigSchema.safeParse(merged);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    throw new Error(`설정 오류: ${msg}`);
  }

  return parsed.data as AgentRunConfig;
}

/** 예시 설정 파일 경로 */
export const CONFIG_EXAMPLE_PATH = path.join(process.cwd(), "agent.config.example.json");
export const CONFIG_LOCAL_PATH = path.join(process.cwd(), "agent.config.local.json");
