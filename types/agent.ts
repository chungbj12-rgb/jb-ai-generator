import type { Tone } from "@/types";

export type AgentJobStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "posting"
  | "draft_saved"
  | "failed";

export type TextProvider = "gemini" | "openai";
export type ImageProvider = "gemini" | "openai";

/** 에이전트 실행에 필요한 전체 입력값 */
export interface AgentRunConfig {
  naverId: string;
  naverPassword: string;
  blogId: string;
  topic: string;
  ctaText: string;
  ctaButtonText: string;
  ctaButtonLink: string;
  /** 글 생성 모델 (예: gemini-2.5-flash, gpt-4o) */
  textModel: string;
  /** 이미지 생성 모델 (예: imagen-4.0-generate-001, dall-e-3) */
  imageModel: string;
  /** 통합 API 키 (제공자 자동 판별 시 사용) */
  apiKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  tone?: Tone;
  imageCount?: number;
}

/** API·DB 저장용 — 비밀번호·API 키 제외 */
export type AgentRunConfigPublic = Omit<
  AgentRunConfig,
  "naverPassword" | "apiKey" | "geminiApiKey" | "openaiApiKey"
>;

/** 블로그 본문 블록 */
export type BlogBlockType = "heading" | "paragraph" | "image" | "cta";

export interface BlogBlock {
  type: BlogBlockType;
  content?: string;
  imagePrompt?: string;
  imageAlt?: string;
  imagePath?: string;
  ctaText?: string;
  ctaButtonText?: string;
  ctaButtonLink?: string;
}

export interface AgentPayload {
  title: string;
  blocks: BlogBlock[];
  hashtags: string[];
  totalChars: number;
  imageCount: number;
  cta?: {
    text: string;
    buttonText: string;
    buttonLink: string;
  };
}

export interface AgentJob {
  id: string;
  user_id: string;
  topic: string;
  tone: Tone;
  status: AgentJobStatus;
  config: AgentRunConfigPublic | null;
  payload: AgentPayload | null;
  naver_draft_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrepareAgentRequest extends AgentRunConfig {
  tone: Tone;
}

export interface PrepareAgentResponse {
  jobId: string;
  status: AgentJobStatus;
  payload?: Partial<AgentPayload>;
  error?: string;
}

export interface AgentModelConfig {
  textModel: string;
  imageModel: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  apiKey?: string;
}
