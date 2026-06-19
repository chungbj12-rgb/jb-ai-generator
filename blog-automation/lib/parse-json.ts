/** AI 응답에서 JSON 객체 추출 */

function stripFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function parseJsonObject<T>(text: string): T {
  const cleaned = stripFence(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON 파싱 실패");
    return JSON.parse(match[0]) as T;
  }
}
