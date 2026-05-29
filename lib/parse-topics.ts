/** Gemini 응답에서 주제 JSON 배열 추출 */

function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** 텍스트에서 주제 문자열 배열 파싱 (실패 시 null) */
export function parseTopicsFromText(text: string): string[] | null {
  const cleaned = stripCodeFence(text);

  const tryParse = (raw: string): string[] | null => {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return null;
      const topics = parsed
        .map((item) =>
          String(item)
            .trim()
            .replace(/^["'`]+|["'`,]+$/g, ""),
        )
        .filter((s) => s.length > 5 && s !== "```json" && !s.startsWith("```"));
      return topics.length > 0 ? topics.slice(0, 5) : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(cleaned);
  if (direct) return direct;

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const nested = tryParse(arrayMatch[0]);
    if (nested) return nested;
  }

  const lines = cleaned
    .split("\n")
    .map((l) => l.replace(/^[\d.\-"'\s•·]+/, "").trim())
    .filter(
      (l) =>
        l.length > 8 &&
        l !== "```json" &&
        !l.startsWith("```") &&
        !l.startsWith("{") &&
        !l.startsWith("["),
    );

  return lines.length > 0 ? lines.slice(0, 5) : null;
}
