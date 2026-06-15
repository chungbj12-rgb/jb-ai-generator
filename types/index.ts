export type Tone = "friendly" | "professional" | "emotional";
export type Platform = "naver" | "thread";

export interface BlogPost {
  id: string;
  user_id: string;
  topic: string;
  tone: Tone;
  naver_content: string | null;
  thread_content: string | null;
  naver_hashtags?: string[] | null;
  created_at: string;
  user_email?: string;
}

export interface GenerateRequest {
  topic: string;
  tone: Tone;
  platform: Platform;
}

export interface GenerateResponse {
  id?: string;
  naver_content?: string;
  thread_content?: string;
  naver_hashtags?: string[];
  error?: string;
}

export interface SuggestTopicsRequest {
  keyword: string;
  platform?: Platform;
}

export interface GenerateFormState {
  topic: string;
  tone: Tone;
  platform: Platform;
}

export interface ToneOption {
  value: Tone;
  label: string;
  emoji: string;
  description: string;
}

/** DB prompt_guidelines 테이블 */
export interface PromptGuideline {
  id: string;
  platform: Platform;
  title: string;
  content: string;
  updated_at: string;
  updated_by: string | null;
}

export type {
  AgentJob,
  AgentJobStatus,
  AgentPayload,
  BlogBlock,
  PrepareAgentRequest,
  PrepareAgentResponse,
} from "@/types/agent";
