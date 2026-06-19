// AI 피드백 기반 글 수정
import { NextRequest, NextResponse } from "next/server";
import { reviseContent } from "@/lib/revise-content";
import { isOpenAIConfigured } from "@/lib/llm";
import { createClient } from "@/lib/supabase/server";
import { resolveNaverGuideline } from "@/lib/prompts/resolve-naver-guideline";
import type { Platform } from "@/types";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platform: Platform =
      body.platform === "thread" ? "thread" : "naver";
    const topic = String(body.topic ?? "").trim();
    const feedback = String(body.feedback ?? "").trim();
    const currentContent = String(body.currentContent ?? "").trim();
    const keyword = body.keyword ? String(body.keyword).trim() : undefined;
    const postId = body.postId ? String(body.postId) : undefined;

    if (!topic || !feedback || !currentContent) {
      return NextResponse.json(
        { error: "주제, 현재 글, 수정 요청 내용은 필수입니다." },
        { status: 400 },
      );
    }

    if (feedback.length < 10) {
      return NextResponse.json(
        { error: "수정 요청을 조금 더 구체적으로 작성해 주세요. (10자 이상)" },
        { status: 400 },
      );
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (postId) {
      const { data: post, error: postError } = await supabase
        .from("blog_posts")
        .select("id, user_id")
        .eq("id", postId)
        .single();

      if (postError || !post || post.user_id !== user.id) {
        return NextResponse.json(
          { error: "글을 찾을 수 없거나 권한이 없습니다." },
          { status: 404 },
        );
      }
    }

    const naverGuideline =
      platform === "naver" ? await resolveNaverGuideline(supabase) : "";

    const result = await reviseContent({
      platform,
      topic,
      keyword,
      currentContent,
      feedback,
      naverGuideline,
    });

    if (postId) {
      const column = platform === "naver" ? "naver_content" : "thread_content";
      await supabase
        .from("blog_posts")
        .update({ [column]: result.revised_content })
        .eq("id", postId);

      await supabase.from("blog_generation_log").insert({
        post_id: postId,
        stage: 2,
        provider: "openai",
        model: `${process.env.OPENAI_FINAL_MODEL?.trim() || "gpt-5.4"}-revision`,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost_usd: result.costUsd,
      });
    }

    return NextResponse.json({
      revised_content: result.revised_content,
      edits_summary: result.edits_summary,
      char_count: result.char_count,
      cost_usd: result.costUsd,
      platform,
    });
  } catch (error) {
    console.error("글 수정 오류:", error);
    const message =
      error instanceof Error ? error.message : "글 수정 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
