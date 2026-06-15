import path from "path";
import fs from "fs/promises";
import { createClient } from "@/lib/supabase/server";
import { planBlogContent } from "@/lib/agent/content-planner";
import { AGENT_OUTPUT_ROOT } from "@/agent/config";
import { toPublicConfig } from "@/lib/agent/config-schema";
import type { AgentJob, AgentPayload, AgentRunConfig } from "@/types/agent";
import type { Tone } from "@/types";

export async function createAgentJob(
  userId: string,
  config: AgentRunConfig,
  tone: Tone,
): Promise<AgentJob> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_jobs")
    .insert({
      user_id: userId,
      topic: config.topic,
      tone,
      status: "preparing",
      config: toPublicConfig(config),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "작업 생성 실패");
  }

  return data as AgentJob;
}

export async function updateAgentJob(
  jobId: string,
  patch: Partial<Pick<AgentJob, "status" | "payload" | "naver_draft_url" | "error_message" | "config">>,
): Promise<AgentJob> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_jobs")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "작업 업데이트 실패");
  }

  return data as AgentJob;
}

export async function getAgentJob(jobId: string): Promise<AgentJob | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) return null;
  return data as AgentJob;
}

/** 웹에서 콘텐츠 기획 (이미지는 CLI에서 생성) */
export async function prepareJobAssets(
  jobId: string,
  config: AgentRunConfig,
  tone: Tone,
  guideline: string,
): Promise<AgentPayload> {
  const outputDir = path.join(AGENT_OUTPUT_ROOT, jobId);
  await fs.mkdir(outputDir, { recursive: true });

  const payload = await planBlogContent({
    topic: config.topic,
    keyword: config.keyword,
    firstSentence: config.firstSentence,
    tone,
    guideline,
    imageCount: config.imageCount,
    cta: config,
    modelConfig: {
      textModel: config.textModel,
      imageModel: config.imageModel,
      apiKey: config.apiKey,
      geminiApiKey: config.geminiApiKey,
      openaiApiKey: config.openaiApiKey,
    },
  });

  const manifestPath = path.join(outputDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(payload, null, 2), "utf-8");

  await updateAgentJob(jobId, { status: "ready", payload });
  return payload;
}
