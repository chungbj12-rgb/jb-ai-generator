export type Tone = "friendly" | "professional" | "emotional";
export type Platform = "naver" | "thread" | "both";

export interface BlogPost {
  id: string;
  user_id: string;
  topic: string;
  tone: Tone;
  naver_content: string | null;
  thread_content: string | null;
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
  error?: string;
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
