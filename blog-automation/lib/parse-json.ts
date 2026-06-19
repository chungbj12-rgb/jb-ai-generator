/** AI 응답에서 JSON 객체 추출 (다중 전략 + 복구) */

function stripFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** 문자열 내부를 고려한 균형 잡힌 `{...}` 추출 */
function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function repairJson(raw: string): string {
  return raw
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function tryParse<T>(raw: string): T | null {
  for (const candidate of [raw, repairJson(raw)]) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // next attempt
    }
  }
  return null;
}

export function parseJsonObject<T>(text: string): T {
  const cleaned = stripFence(text);
  const candidates = [
    cleaned,
    extractBalancedJsonObject(cleaned),
    extractBalancedJsonObject(text),
  ].filter((v): v is string => !!v?.trim());

  for (const raw of candidates) {
    const parsed = tryParse<T>(raw);
    if (parsed !== null) return parsed;
  }

  const preview = cleaned.replace(/\s+/g, " ").slice(0, 100);
  throw new Error(
    `JSON 파싱 실패: AI가 올바른 JSON을 반환하지 않았습니다. (${preview}…)`,
  );
}
