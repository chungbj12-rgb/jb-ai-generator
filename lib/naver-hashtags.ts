// 네이버 블로그 연관 키워드 해시태그 생성
import { generateShortText, isProviderConfigured } from "@/lib/llm";
import type { TextProvider } from "@/lib/llm";
import { parseTopicsFromText } from "@/lib/parse-topics";

/** 해시태그 앞에 # 보장 */
export function normalizeHashtag(tag: string): string {
  const t = tag.trim().replace(/^#+/, "");
  return t ? `#${t}` : "";
}

/** API 키 없을 때 폴백 해시태그 */
export function mockNaverHashtags(keyword: string): string[] {
  const base = keyword.replace(/\s+/g, "");
  return [
    `#${base}`,
    `#${base}추천`,
    `#${base}후기`,
    `#${base}꿀팁`,
    `#${base}정보`,
    `#네이버블로그`,
    `#블로그`,
    `#일상`,
    `#추천`,
    `#꿀팁`,
  ].slice(0, 10);
}

/** 네이버 상위노출용 연관 키워드 해시태그 10개 생성 */
export async function generateNaverHashtags(
  topic: string,
  content: string,
  textProvider: TextProvider = "gemini",
): Promise<string[]> {
  if (!isProviderConfigured(textProvider)) {
    return mockNaverHashtags(topic);
  }

  const excerpt = content.slice(0, 800);

  try {
    const text = await generateShortText(`[블로그 제목]
${topic}

[본문 일부]
${excerpt}

위 네이버 블로그 글에 맞는 **연관 키워드 해시태그 10개**를 추천해 주세요.

조건:
- 네이버 검색 상위노출에 도움이 되는 실제 연관 키워드
- 메인 키워드 + 롱테일/연관 키워드 조합
- 각 항목은 반드시 #으로 시작 (예: #제주여행)
- 해시태그만 10개, 설명 없음
- JSON 배열만 출력 (마크다운 코드블록 없이)
예: ["#키워드1", "#키워드2", "#키워드3", "#키워드4", "#키워드5", "#키워드6", "#키워드7", "#키워드8", "#키워드9", "#키워드10"]`, textProvider);

    const parsed = parseTopicsFromText(text, 10);
    if (parsed?.length) {
      return parsed.map(normalizeHashtag).filter(Boolean).slice(0, 10);
    }
  } catch (error) {
    console.error("해시태그 생성 오류:", error);
  }

  return mockNaverHashtags(topic);
}
