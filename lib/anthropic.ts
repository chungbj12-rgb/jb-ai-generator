// Anthropic 클라이언트 싱글톤 — 서버 사이드 전용
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const CLAUDE_MODEL = "claude-sonnet-4-5";
export const MAX_TOKENS = 2048;
