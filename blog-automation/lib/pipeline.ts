import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcCostUsd,
  PIPELINE_CONFIG,
} from "@/blog-automation/lib/config";
import { runStage1Research } from "@/blog-automation/lib/stage1-research";
import {
  isBodyLengthValid,
  lengthAdjustHint,
  runStage2Finalize,
} from "@/blog-automation/lib/stage2-finalize";

export type PipelineStatus = "completed" | "needs_review" | "failed";

export interface StageCostLog {
  stage: 1 | 2;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface PipelineResult {
  postId?: string;
  title: string;
  final_body: string;
  title_candidates: string[];
  edits_made: string[];
  seo_checklist_result: Record<string, string>;
  stage_costs: StageCostLog[];
  total_cost_usd: number;
  status: PipelineStatus;
  char_count: number;
}

interface LogContext {
  supabase: SupabaseClient;
  postId: string;
}

async function logStage(
  ctx: LogContext,
  entry: StageCostLog,
): Promise<void> {
  const { error } = await ctx.supabase.from("blog_generation_log").insert({
    post_id: ctx.postId,
    stage: entry.stage,
    provider: entry.provider,
    model: entry.model,
    input_tokens: entry.inputTokens,
    output_tokens: entry.outputTokens,
    cost_usd: entry.costUsd,
  });
  if (error) {
    console.error("blog_generation_log 저장 실패:", error.message);
  }
}

function geminiCost(input: number, output: number): number {
  const p = PIPELINE_CONFIG.pricing;
  return calcCostUsd(
    input,
    output,
    p.geminiInputPer1M,
    p.geminiOutputPer1M,
  );
}

function openaiCost(input: number, output: number): number {
  const p = PIPELINE_CONFIG.pricing;
  return calcCostUsd(
    input,
    output,
    p.openaiInputPer1M,
    p.openaiOutputPer1M,
  );
}

export interface GenerateBlogPostOptions {
  supabase?: SupabaseClient;
  postId?: string;
  userId?: string;
  tone?: string;
}

/**
 * 2단계 블로그 파이프라인: Gemini(자료조사+초안) → GPT(품질보정+최종)
 */
export async function generateBlogPost(
  keyword: string,
  topic: string,
  options: GenerateBlogPostOptions = {},
): Promise<PipelineResult> {
  const { supabase, postId: existingPostId, userId, tone = "friendly" } =
    options;
  const stage_costs: StageCostLog[] = [];
  let postId = existingPostId;

  if (supabase && userId && !postId) {
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        user_id: userId,
        topic,
        tone,
        keyword,
        pipeline_status: "processing",
      })
      .select("id")
      .single();
    if (error) throw new Error(`글 초기화 실패: ${error.message}`);
    postId = data.id;
  }

  const logCtx: LogContext | null =
    supabase && postId ? { supabase, postId } : null;

  try {
    // Stage 1
    const stage1 = await runStage1Research(keyword, topic);
    const stage1Cost: StageCostLog = {
      stage: 1,
      provider: stage1.provider,
      model: stage1.model,
      inputTokens: stage1.inputTokens,
      outputTokens: stage1.outputTokens,
      costUsd: geminiCost(stage1.inputTokens, stage1.outputTokens),
    };
    stage_costs.push(stage1Cost);
    if (logCtx) await logStage(logCtx, stage1Cost);

    // Stage 2 (글자수 미달 시 1회 재호출)
    let stage2 = await runStage2Finalize(stage1.output, keyword, topic);
    let stage2Cost: StageCostLog = {
      stage: 2,
      provider: stage2.provider,
      model: stage2.model,
      inputTokens: stage2.inputTokens,
      outputTokens: stage2.outputTokens,
      costUsd: openaiCost(stage2.inputTokens, stage2.outputTokens),
    };
    stage_costs.push(stage2Cost);
    if (logCtx) await logStage(logCtx, stage2Cost);

    if (!isBodyLengthValid(stage2.output.final_body)) {
      const retry = await runStage2Finalize(
        stage1.output,
        keyword,
        topic,
        lengthAdjustHint(stage2.output.final_body),
      );
      const retryCost: StageCostLog = {
        stage: 2,
        provider: retry.provider,
        model: retry.model,
        inputTokens: retry.inputTokens,
        outputTokens: retry.outputTokens,
        costUsd: openaiCost(retry.inputTokens, retry.outputTokens),
      };
      stage_costs.push(retryCost);
      if (logCtx) await logStage(logCtx, retryCost);
      stage2 = retry;
      stage2Cost = retryCost;
    }

    const final_body = stage2.output.final_body;
    const char_count = final_body.length;
    const lengthOk = isBodyLengthValid(final_body);
    const status: PipelineStatus = lengthOk ? "completed" : "needs_review";
    const total_cost_usd = stage_costs.reduce((s, c) => s + c.costUsd, 0);

    if (supabase && postId) {
      await supabase
        .from("blog_posts")
        .update({
          topic: stage2.output.title || topic,
          naver_content: final_body,
          keyword,
          pipeline_status: status,
        })
        .eq("id", postId);
    }

    return {
      postId,
      title: stage2.output.title,
      final_body,
      title_candidates: stage1.output.title_candidates,
      edits_made: stage2.output.edits_made ?? [],
      seo_checklist_result: stage2.output.seo_checklist_result ?? {},
      stage_costs,
      total_cost_usd,
      status,
      char_count,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (supabase && userId) {
      if (postId) {
        await supabase
          .from("blog_posts")
          .update({ pipeline_status: "needs_review" })
          .eq("id", postId);
      } else {
        const { data } = await supabase
          .from("blog_posts")
          .insert({
            user_id: userId,
            topic,
            tone,
            keyword,
            pipeline_status: "needs_review",
            naver_content: `[파이프라인 오류 — 검토 필요]\n${message}`,
          })
          .select("id")
          .single();
        postId = data?.id;
      }
    }

    throw error;
  }
}
