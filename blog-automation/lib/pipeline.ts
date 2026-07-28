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
import {
  isAnthropicConfigured,
  runStage3Humanize,
} from "@/blog-automation/lib/stage3-humanize";

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

function anthropicCost(input: number, output: number): number {
  const p = PIPELINE_CONFIG.pricing;
  return calcCostUsd(
    input,
    output,
    p.anthropicInputPer1M,
    p.anthropicOutputPer1M,
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
 * 3단계 블로그 파이프라인: Gemini(자료조사+초안) → GPT(품질보정+최종) → Claude(사람이 쓴 것처럼 다듬기)
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

    // Stage 3 (Claude — 사람이 쓴 것처럼 문장 다듬기, 글자수 미달 시 1회 재호출).
    // 키 미설정이거나 API 오류로 끝내 실패하면 Stage 2(GPT) 결과를 그대로 최종본으로
    // 사용해 파이프라인이 끊기지 않도록 한다 (stage2 프롬프트도 자연스러운 문체를 지시함).
    let stage3Output: { final_body: string; edits_made: string[] } | null = null;

    if (isAnthropicConfigured()) {
      try {
        let stage3 = await runStage3Humanize(stage2.output, keyword, topic);
        const stage3Cost: StageCostLog = {
          stage: 3,
          provider: stage3.provider,
          model: stage3.model,
          inputTokens: stage3.inputTokens,
          outputTokens: stage3.outputTokens,
          costUsd: anthropicCost(stage3.inputTokens, stage3.outputTokens),
        };
        stage_costs.push(stage3Cost);
        if (logCtx) await logStage(logCtx, stage3Cost);

        if (!isBodyLengthValid(stage3.output.final_body)) {
          try {
            const retry = await runStage3Humanize(
              stage2.output,
              keyword,
              topic,
              lengthAdjustHint(stage3.output.final_body),
            );
            const retryCost: StageCostLog = {
              stage: 3,
              provider: retry.provider,
              model: retry.model,
              inputTokens: retry.inputTokens,
              outputTokens: retry.outputTokens,
              costUsd: anthropicCost(retry.inputTokens, retry.outputTokens),
            };
            stage_costs.push(retryCost);
            if (logCtx) await logStage(logCtx, retryCost);
            stage3 = retry;
          } catch (retryError) {
            console.error(
              "Stage 3(Claude) 글자수 재조정 실패 — 1차 결과를 사용합니다:",
              retryError instanceof Error ? retryError.message : retryError,
            );
          }
        }

        stage3Output = stage3.output;
      } catch (error) {
        console.error(
          "Stage 3(Claude) 실패 — Stage 2(GPT) 결과로 최종 마무리합니다:",
          error instanceof Error ? error.message : error,
        );
      }
    } else {
      console.warn(
        "ANTHROPIC_API_KEY 미설정 — Stage 3(Claude)를 건너뛰고 Stage 2(GPT) 결과로 최종 마무리합니다.",
      );
    }

    const final_body = stage3Output?.final_body ?? stage2.output.final_body;
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
      edits_made: [
        ...(stage2.output.edits_made ?? []),
        ...(stage3Output?.edits_made ?? []),
      ],
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
