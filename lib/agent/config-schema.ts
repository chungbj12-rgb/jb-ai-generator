import { z } from "zod";

export const agentRunConfigSchema = z.object({
  naverId: z.string().min(1, "네이버 아이디는 필수입니다."),
  naverPassword: z.string().min(1, "네이버 비밀번호는 필수입니다."),
  blogId: z.string().min(1, "블로그 ID는 필수입니다."),
  topic: z.string().min(1, "글 주제는 필수입니다."),
  ctaText: z.string().min(1, "CTA 문구는 필수입니다."),
  ctaButtonText: z.string().min(1, "CTA 버튼 문구는 필수입니다."),
  ctaButtonLink: z.string().url("CTA 버튼 링크는 URL 형식이어야 합니다."),
  textModel: z.string().min(1, "글 생성 모델명은 필수입니다."),
  imageModel: z.string().min(1, "이미지 생성 모델명은 필수입니다."),
  apiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  tone: z.enum(["friendly", "professional", "emotional"]).optional(),
  imageCount: z.coerce.number().int().min(6).max(8).optional(),
});

export type AgentRunConfigInput = z.infer<typeof agentRunConfigSchema>;

/** API 키가 최소 1개 있는지 확인 */
export function assertHasApiKey(
  config: Pick<
    AgentRunConfigInput,
    "apiKey" | "geminiApiKey" | "openaiApiKey" | "textModel" | "imageModel"
  >,
): void {
  const textProvider = detectTextProvider(config.textModel);
  const imageProvider = detectImageProvider(config.imageModel);

  const geminiKey =
    config.geminiApiKey?.trim() ||
    (textProvider === "gemini" || imageProvider === "gemini"
      ? config.apiKey?.trim()
      : "") ||
    process.env.GEMINI_API_KEY?.trim();

  const openaiKey =
    config.openaiApiKey?.trim() ||
    (textProvider === "openai" || imageProvider === "openai"
      ? config.apiKey?.trim()
      : "") ||
    process.env.OPENAI_API_KEY?.trim();

  if (textProvider === "gemini" && !geminiKey) {
    throw new Error("Gemini 글 생성을 위해 GEMINI_API_KEY 또는 apiKey가 필요합니다.");
  }
  if (textProvider === "openai" && !openaiKey) {
    throw new Error("OpenAI 글 생성을 위해 OPENAI_API_KEY 또는 apiKey가 필요합니다.");
  }
  if (imageProvider === "gemini" && !geminiKey) {
    throw new Error("Gemini 이미지 생성을 위해 GEMINI_API_KEY 또는 apiKey가 필요합니다.");
  }
  if (imageProvider === "openai" && !openaiKey) {
    throw new Error("OpenAI 이미지 생성을 위해 OPENAI_API_KEY 또는 apiKey가 필요합니다.");
  }
}

export function detectTextProvider(model: string): "gemini" | "openai" {
  const m = model.toLowerCase();
  if (
    m.startsWith("gpt") ||
    m.startsWith("o1") ||
    m.startsWith("o3") ||
    m.startsWith("o4") ||
    m.includes("chatgpt")
  ) {
    return "openai";
  }
  return "gemini";
}

export function detectImageProvider(model: string): "gemini" | "openai" {
  const m = model.toLowerCase();
  if (m.includes("dall-e") || m.includes("dalle") || m.startsWith("gpt-image")) {
    return "openai";
  }
  return "gemini";
}

export function toPublicConfig(
  config: AgentRunConfigInput,
): Omit<AgentRunConfigInput, "naverPassword" | "apiKey" | "geminiApiKey" | "openaiApiKey"> {
  const {
    naverPassword: _p,
    apiKey: _a,
    geminiApiKey: _g,
    openaiApiKey: _o,
    ...rest
  } = config;
  return rest;
}
