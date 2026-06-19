export type Tone = "friendly" | "professional" | "emotional";
export type Platform = "naver" | "thread";
export type TextProvider = "gemini" | "openai";
export type ThreadAccountType = "personal" | "center";

export interface BlogPost {
  id: string;
  user_id: string;
  topic: string;
  tone: Tone;
  naver_content: string | null;
  thread_content: string | null;
  naver_hashtags?: string[] | null;
  keyword?: string | null;
  pipeline_status?: string | null;
  created_at: string;
  user_email?: string;
}

export interface GenerateRequest {
  topic: string;
  tone: Tone;
  platform: Platform;
  textProvider?: TextProvider;
  keyword?: string;
  /** 쓰레드 전용: personal(정봉진) | center(JB스포츠) */
  accountType?: ThreadAccountType;
}

export interface PipelineCostSummary {
  status: string;
  char_count: number;
  total_cost_usd: number;
  stage_costs?: Array<{
    stage: number;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }>;
  edits_made?: string[];
}

export interface GenerateResponse {
  id?: string;
  title?: string;
  topic?: string;
  keyword?: string;
  naver_content?: string;
  thread_content?: string;
  naver_hashtags?: string[];
  pipeline?: PipelineCostSummary;
  error?: string;
}

export interface RevisePostResponse {
  revised_content: string;
  edits_summary: string;
  char_count: number;
  cost_usd: number;
  platform: Platform;
  error?: string;
}

export interface SuggestTopicsRequest {
  keyword: string;
  platform?: Platform;
  textProvider?: TextProvider;
}

export interface GenerateFormState {
  topic: string;
  keyword: string;
  tone: Tone;
  platform: Platform;
  textProvider: TextProvider;
  threadAccountType: ThreadAccountType;
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
