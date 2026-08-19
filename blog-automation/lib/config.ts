/** 2단계 파이프라인 환경·단가 설정 */

export const PIPELINE_CONFIG = {
  geminiDraftModel:
    process.env.GEMINI_DRAFT_MODEL?.trim() || "gemini-3.5-flash-lite",
  openaiFinalModel: process.env.OPENAI_FINAL_MODEL?.trim() || "gpt-5.4",
  anthropicHumanizeModel:
    process.env.ANTHROPIC_HUMANIZE_MODEL?.trim() || "claude-sonnet-5",
  minChars: Number(process.env.PIPELINE_MIN_CHARS ?? 1500),
  maxChars: Number(process.env.PIPELINE_MAX_CHARS ?? 1800),
  /** 1M 토큰당 USD — .env로 덮어쓰기 가능 */
  pricing: {
    geminiInputPer1M: Number(process.env.GEMINI_INPUT_PRICE_PER_1M ?? 0.3),
    geminiOutputPer1M: Number(process.env.GEMINI_OUTPUT_PRICE_PER_1M ?? 2.5),
    openaiInputPer1M: Number(process.env.OPENAI_INPUT_PRICE_PER_1M ?? 2.5),
    openaiOutputPer1M: Number(process.env.OPENAI_OUTPUT_PRICE_PER_1M ?? 15),
    anthropicInputPer1M: Number(process.env.ANTHROPIC_INPUT_PRICE_PER_1M ?? 3),
    anthropicOutputPer1M: Number(
      process.env.ANTHROPIC_OUTPUT_PRICE_PER_1M ?? 15,
    ),
  },
} as const;

export function calcCostUsd(
  inputTokens: number,
  outputTokens: number,
  inputPer1M: number,
  outputPer1M: number,
): number {
  return (
    (inputTokens / 1_000_000) * inputPer1M +
    (outputTokens / 1_000_000) * outputPer1M
  );
}
