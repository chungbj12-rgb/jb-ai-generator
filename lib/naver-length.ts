/** 지침·프롬프트에서 본문 분량(자) 추출 */

export const DEFAULT_NAVER_MIN_CHARS = 1500;
export const DEFAULT_NAVER_MAX_CHARS = 1800;

export interface NaverLengthBounds {
  min: number;
  max: number;
}

/** 지침 본문에서 "1500-1800자" 등 패턴 파싱 */
export function parseNaverLengthFromGuideline(
  guideline: string,
): NaverLengthBounds | null {
  const range = guideline.match(
    /(\d{3,5})\s*(?:[-~–—]|에서|부터)\s*(\d{3,5})\s*자/,
  );
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (min > 0 && max >= min) return { min, max };
  }

  const minOnly = guideline.match(/최소\s*(\d{3,5})\s*자/);
  if (minOnly) {
    const min = Number(minOnly[1]);
    if (min > 0) return { min, max: min + 300 };
  }

  return null;
}

export function getNaverLengthBounds(guideline: string): NaverLengthBounds {
  return (
    parseNaverLengthFromGuideline(guideline) ?? {
      min: DEFAULT_NAVER_MIN_CHARS,
      max: DEFAULT_NAVER_MAX_CHARS,
    }
  );
}

export function isNaverContentTooShort(
  content: string,
  bounds: NaverLengthBounds,
): boolean {
  return content.length < Math.floor(bounds.min * 0.9);
}
