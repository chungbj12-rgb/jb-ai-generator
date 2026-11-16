import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcCostUsd,
  PIPELINE_CONFIG,
} from "@/blog-automation/lib/config";
import { buildMergedPipelineGuideline } from "@/blog-automation/lib/merged-guideline";
import { runStage1Research } from "@/blog-automation/lib/stage1-research";
import {
  isBodyLengthValid,
  lengthAdjustHint,
  runStage2Finalize,
} from "@/blog-automation/lib/stage2-finalize";
import { runStage3Humanize } from "@/blog-automation/lib/stage3-humanize";
import { isStage3Enabled } from "@/lib/anthropic";

export type PipelineStatus = "completed" | "needs_review" | "failed";

export interface StageCostLog {
  stage: 1 | 2 | 3;
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

function claudeCost(input: number, output: number): number {
  const p = PIPELINE_CONFIG.pricing;
  return calcCostUsd(
    input,
    output,
    p.claudeInputPer1M,
    p.claudeOutputPer1M,
  );
}

export interface GenerateBlogPostOptions {
  supabase?: SupabaseClient;
  postId?: string;
  userId?: string;
  tone?: string;
  /** 지침관리(naver) DB content */
  naverGuideline?: string;
  /** 패키징 클라이언트에서 지정하는 맞춤 CTA 문구 */
  customCta?: string;
}

/**
 * 3단계 블로그 파이프라인:
 * Gemini(연구·초안) → GPT(정돈·브랜드) → Claude(대표 직접 쓴 듯 윤문, 선택)
 */
export async function generateBlogPost(
  keyword: string,
  topic: string,
  options: GenerateBlogPostOptions = {},
): Promise<PipelineResult> {
  const { supabase, postId: existingPostId, userId, tone = "friendly", naverGuideline = "", customCta } =
    options;
  const stage_costs: StageCostLog[] = [];
  let postId = existingPostId;
  const mergedGuideline = buildMergedPipelineGuideline(naverGuideline);

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
    const stage1 = await runStage1Research(keyword, topic, mergedGuideline);
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
    let stage2 = await runStage2Finalize(stage1.output, keyword, topic, mergedGuideline, undefined, customCta);
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
        mergedGuideline,
        lengthAdjustHint(stage2.output.final_body),
        customCta,
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

    let finalTitle = stage2.output.title;
    let final_body = stage2.output.final_body;
    let edits_made = [...(stage2.output.edits_made ?? [])];
    const seo_checklist_result = stage2.output.seo_checklist_result ?? {};

    // Stage 3 — Claude 휴먼 마무리 (ANTHROPIC_API_KEY 있을 때)
    if (isStage3Enabled()) {
      let stage3 = await runStage3Humanize(
        stage1.output,
        stage2.output,
        keyword,
        topic,
        mergedGuideline,
      );
      let stage3Cost: StageCostLog = {
        stage: 3,
        provider: stage3.provider,
        model: stage3.model,
        inputTokens: stage3.inputTokens,
        outputTokens: stage3.outputTokens,
        costUsd: claudeCost(stage3.inputTokens, stage3.outputTokens),
      };
      stage_costs.push(stage3Cost);
      if (logCtx) await logStage(logCtx, stage3Cost);

      if (!isBodyLengthValid(stage3.output.final_body)) {
        const retry3 = await runStage3Humanize(
          stage1.output,
          stage2.output,
          keyword,
          topic,
          mergedGuideline,
          lengthAdjustHint(stage3.output.final_body),
        );
        const retry3Cost: StageCostLog = {
          stage: 3,
          provider: retry3.provider,
          model: retry3.model,
          inputTokens: retry3.inputTokens,
          outputTokens: retry3.outputTokens,
          costUsd: claudeCost(retry3.inputTokens, retry3.outputTokens),
        };
        stage_costs.push(retry3Cost);
        if (logCtx) await logStage(logCtx, retry3Cost);
        stage3 = retry3;
        stage3Cost = retry3Cost;
      }

      finalTitle = stage3.output.title;
      final_body = stage3.output.final_body;
      if (stage3.output.humanizing_edits?.length) {
        edits_made = [
          ...edits_made,
          ...stage3.output.humanizing_edits.map((e) => `[3단계] ${e}`),
        ];
      }
    }

    const char_count = final_body.length;
    const lengthOk = isBodyLengthValid(final_body);
    const status: PipelineStatus = lengthOk ? "completed" : "needs_review";
    const total_cost_usd = stage_costs.reduce((s, c) => s + c.costUsd, 0);

    if (supabase && postId) {
      await supabase
        .from("blog_posts")
        .update({
          topic: finalTitle || topic,
          naver_content: final_body,
          keyword,
          pipeline_status: status,
        })
        .eq("id", postId);
    }

    return {
      postId,
      title: finalTitle,
      final_body,
      title_candidates: stage1.output.title_candidates,
      edits_made,
      seo_checklist_result,
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
