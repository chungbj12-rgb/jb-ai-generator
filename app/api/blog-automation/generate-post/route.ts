// 2단계 블로그 파이프라인 API — POST { keyword, topic, tone? }
import { NextRequest, NextResponse } from "next/server";
import { generateBlogPost } from "@/blog-automation/lib/pipeline";
import { createClient } from "@/lib/supabase/server";
import { generateNaverHashtags } from "@/lib/naver-hashtags";
import { isGeminiConfigured } from "@/lib/gemini";
import { isOpenAIConfigured } from "@/lib/llm";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = String(body.keyword ?? "").trim();
    const topic = String(body.topic ?? "").trim();
    const tone = body.tone ?? "friendly";

    if (!keyword || !topic) {
      return NextResponse.json(
        { error: "keyword와 topic은 필수입니다." },
        { status: 400 },
      );
    }

    if (!isGeminiConfigured() || !isOpenAIConfigured()) {
      return NextResponse.json(
        {
          error:
            "2단계 파이프라인에 GEMINI_API_KEY와 OPENAI_API_KEY가 모두 필요합니다.",
        },
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

    const result = await generateBlogPost(keyword, topic, {
      supabase,
      userId: user.id,
      tone,
    });

    let naverHashtags: string[] | undefined;
    try {
      naverHashtags = await generateNaverHashtags(
        result.title || topic,
        result.final_body,
        "gemini",
      );
      if (result.postId) {
        await supabase
          .from("blog_posts")
          .update({ naver_hashtags: naverHashtags })
          .eq("id", result.postId);
      }
    } catch (tagError) {
      console.error("해시태그 생성 실패:", tagError);
    }

    return NextResponse.json({
      id: result.postId,
      title: result.title,
      naver_content: result.final_body,
      naver_hashtags: naverHashtags,
      pipeline: {
        status: result.status,
        char_count: result.char_count,
        stage_costs: result.stage_costs,
        total_cost_usd: result.total_cost_usd,
        edits_made: result.edits_made,
        seo_checklist_result: result.seo_checklist_result,
      },
    });
  } catch (error) {
    console.error("파이프라인 오류:", error);
    const message =
      error instanceof Error ? error.message : "글 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
