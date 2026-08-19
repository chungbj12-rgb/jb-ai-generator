import { ThinkingLevel, type ThinkingConfig } from "@google/genai";

/**
 * 모델 세대에 맞는 thinking 설정을 자동으로 만들어 준다.
 *
 * Gemini는 세대마다 thinking 제어 방식이 다르고, 서로 호환되지 않는다.
 * 맞지 않는 쪽을 보내면 400 INVALID_ARGUMENT로 실패한다.
 *
 *   gemini-2.x 이하 → thinkingBudget: 0   (thinkingLevel 보내면 400)
 *   gemini-3.x 이상 → thinkingLevel        (thinkingBudget: 0 보내면 400)
 *
 * 모델을 갈아끼워도 호출부는 그대로 두면 되도록 여기서 흡수한다.
 *
 * @param model        실제 호출할 모델명 (예: "gemini-3.6-flash")
 * @param legacyBudget 2.x 계열에서 쓸 thinking 예산. 기본 0 = 비활성
 */
export function thinkingConfigFor(
  model: string,
  legacyBudget = 0,
): ThinkingConfig {
  return isLegacyThinkingModel(model)
    ? { thinkingBudget: legacyBudget }
    : { thinkingLevel: ThinkingLevel.MINIMAL };
}

/**
 * 메이저 버전이 3 미만인 구세대 모델인지 판별한다.
 * 버전 숫자가 없는 별칭(gemini-flash-latest 등)은 최신 세대로 본다.
 */
function isLegacyThinkingModel(model: string): boolean {
  const major = Number(/gemini-(\d+)/.exec(model)?.[1]);
  return Number.isFinite(major) && major < 3;
}
