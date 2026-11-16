/** Anthropic Claude API — 3단계 휴먼 마무리 */

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

export function isStage3Enabled(): boolean {
  const flag = process.env.PIPELINE_STAGE3_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return isAnthropicConfigured();
}

export interface ClaudeMessageResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export async function callClaudeMessages(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  maxTokens = 8192,
): Promise<ClaudeMessageResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) {
      throw new Error("Claude API 키가 올바르지 않습니다 (401).");
    }
    throw new Error(`Stage 3 Claude 오류 (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text = data.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Stage 3: Claude가 빈 응답을 반환했습니다.");
  }

  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}
