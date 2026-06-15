import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  agentRunConfigSchema,
  assertHasApiKey,
  toPublicConfig,
} from "@/lib/agent/config-schema";
import { createAgentJob, prepareJobAssets } from "@/lib/agent/job-service";
import type { PrepareAgentRequest } from "@/types/agent";
import type { Tone } from "@/types";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body: PrepareAgentRequest = await request.json();
    const parsed = agentRunConfigSchema.safeParse({
      ...body,
      tone: body.tone,
      imageCount: body.imageCount ?? 7,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const config = parsed.data;
    assertHasApiKey(config);

    const tone = (body.tone ?? config.tone ?? "friendly") as Tone;

    const { data: guidelineRow } = await supabase
      .from("prompt_guidelines")
      .select("content")
      .eq("platform", "naver")
      .single();

    const guideline = guidelineRow?.content ?? "";

    const job = await createAgentJob(user.id, config, tone);
    const payload = await prepareJobAssets(job.id, config, tone, guideline);

    return NextResponse.json({
      jobId: job.id,
      status: "ready",
      config: toPublicConfig(config),
      payload: {
        title: payload.title,
        totalChars: payload.totalChars,
        imageCount: payload.imageCount,
        hashtags: payload.hashtags,
        cta: payload.cta,
      },
    });
  } catch (error) {
    console.error("에이전트 준비 오류:", error);
    const message =
      error instanceof Error ? error.message : "에이전트 준비 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
