// AI API 연결 상태 진단 (키 값은 노출하지 않음)
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { OPENAI_TEXT_MODEL } from "@/lib/llm";
import { PIPELINE_CONFIG } from "@/blog-automation/lib/config";

export const dynamic = "force-dynamic";

function hasEnv(name: string): boolean {
  return !!process.env[name]?.trim();
}

async function testGemini(): Promise<{ ok: boolean; message: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { ok: false, message: "GEMINI_API_KEY 미설정" };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: 'JSON만 출력: {"status":"ok"}',
      config: { maxOutputTokens: 64, thinkingConfig: { thinkingBudget: 0 } },
    });
    if (!response.text?.trim()) return { ok: false, message: "Gemini 빈 응답" };
    return { ok: true, message: "Gemini 연결 정상" };
  } catch (error) {
    return { ok: false, message: formatApiError(error, "Gemini") };
  }
}

async function testOpenAI(): Promise<{ ok: boolean; message: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, message: "OPENAI_API_KEY 미설정" };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_TEXT_MODEL,
        max_completion_tokens: 64,
        reasoning_effort: "none",
        messages: [{ role: "user", content: "ok" }],
      }),
    });

    if (res.ok) return { ok: true, message: `OpenAI ${OPENAI_TEXT_MODEL} 연결 정상` };
    const body = await res.text();
    return { ok: false, message: formatHttpError("OpenAI", res.status, body) };
  } catch (error) {
    return { ok: false, message: formatApiError(error, "OpenAI") };
  }
}

async function testAnthropic(): Promise<{ ok: boolean; message: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ok: false, message: "ANTHROPIC_API_KEY 미설정" };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PIPELINE_CONFIG.anthropicHumanizeModel,
        max_tokens: 16,
        messages: [{ role: "user", content: "ok" }],
      }),
    });

    if (res.ok)
      return {
        ok: true,
        message: `Claude ${PIPELINE_CONFIG.anthropicHumanizeModel} 연결 정상`,
      };
    const body = await res.text();
    return { ok: false, message: formatHttpError("Claude", res.status, body) };
  } catch (error) {
    return { ok: false, message: formatApiError(error, "Anthropic") };
  }
}

function formatHttpError(provider: string, status: number, body: string): string {
  if (status === 401) return `${provider} API 키 무효 (401)`;
  if (status === 403) return `${provider} 권한 없음 (403) — 결제/조직 설정 확인`;
  if (status === 429) return `${provider} 사용 한도 초과 (429)`;
  return `${provider} 오류 (${status}): ${body.slice(0, 120)}`;
}

function formatApiError(error: unknown, provider: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(msg)) {
    return `${provider} 사용 한도 초과`;
  }
  if (/401|403|API key|PERMISSION_DENIED|invalid/i.test(msg)) {
    return `${provider} API 키 무효 또는 권한 없음`;
  }
  if (/503|overloaded|UNAVAILABLE/i.test(msg)) {
    return `${provider} 서버 일시 과부하`;
  }
  return msg.slice(0, 200);
}

export async function GET() {
  const geminiConfigured = hasEnv("GEMINI_API_KEY");
  const openaiConfigured = hasEnv("OPENAI_API_KEY");
  const anthropicConfigured = hasEnv("ANTHROPIC_API_KEY");
  const supabaseConfigured =
    hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const [geminiTest, openaiTest, anthropicTest] = await Promise.all([
    geminiConfigured ? testGemini() : { ok: false, message: "GEMINI_API_KEY 미설정" },
    openaiConfigured ? testOpenAI() : { ok: false, message: "OPENAI_API_KEY 미설정" },
    anthropicConfigured
      ? testAnthropic()
      : { ok: false, message: "ANTHROPIC_API_KEY 미설정" },
  ]);

  const allKeysPresent = geminiConfigured && openaiConfigured && anthropicConfigured;
  const allTestsOk = geminiTest.ok && openaiTest.ok && anthropicTest.ok;

  return NextResponse.json({
    summary: {
      keysRegistered: allKeysPresent,
      keysWorking: allTestsOk,
      appCurrentlyUses:
        "3단계 파이프라인: Gemini(자료조사+초안) → GPT-5.4(품질보정) → Claude(사람이 쓴 것처럼 다듬기)",
      gptClaudeStatus: anthropicConfigured
        ? `Claude 연동됨 — 3단계 다듬기에 ${PIPELINE_CONFIG.anthropicHumanizeModel} 사용`
        : "Anthropic 키 미등록 — 3단계 파이프라인 실행 불가",
    },
    env: {
      GEMINI_API_KEY: geminiConfigured,
      OPENAI_API_KEY: openaiConfigured,
      ANTHROPIC_API_KEY: anthropicConfigured,
      NEXT_PUBLIC_SUPABASE_URL: hasEnv("NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    },
    supabaseConfigured,
    tests: {
      gemini: geminiTest,
      openai: openaiTest,
      anthropic: anthropicTest,
    },
    note: "Vercel에 키를 새로 넣었다면 재배포 후 이 페이지를 다시 확인하세요.",
  });
}
