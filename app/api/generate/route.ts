// Gemini API 호출 → 글 생성 → Supabase 저장 API 엔드포인트
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBlogText, isGeminiConfigured } from "@/lib/gemini";
import { generateNaverBlogContent } from "@/lib/naver-content";
import { generateNaverHashtags } from "@/lib/naver-hashtags";
import { buildThreadPrompt } from "@/lib/prompts";
import { GenerateRequest } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { topic, tone, platform } = body;

    if (!topic || !tone || !platform) {
      return NextResponse.json(
        { error: "주제, 톤, 플랫폼은 필수 입력 항목입니다." },
        { status: 400 },
      );
    }

    if (platform !== "naver" && platform !== "thread") {
      return NextResponse.json(
        { error: "플랫폼은 네이버 또는 쓰레드 중 하나만 선택할 수 있습니다." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 503 },
      );
    }

    // DB에서 플랫폼별 최신 지침 조회 (실패 시 빈 문자열 폴백)
    const { data: naverGuideline } = await supabase
      .from("prompt_guidelines")
      .select("content")
      .eq("platform", "naver")
      .single();

    const { data: threadGuideline } = await supabase
      .from("prompt_guidelines")
      .select("content")
      .eq("platform", "thread")
      .single();

    const naverGuidelineText = naverGuideline?.content ?? "";
    const threadGuidelineText = threadGuideline?.content ?? "";

    let naverContent: string | null = null;
    let threadContent: string | null = null;
    let naverHashtags: string[] | null = null;

    if (platform === "naver") {
      naverContent = await generateNaverBlogContent(
        topic,
        tone,
        naverGuidelineText,
      );
      naverHashtags = await generateNaverHashtags(topic, naverContent);
    }

    if (platform === "thread") {
      threadContent = await generateBlogText(
        buildThreadPrompt(topic, tone, threadGuidelineText),
      );
    }

    const { data: savedPost, error: dbError } = await supabase
      .from("blog_posts")
      .insert({
        user_id: user.id,
        topic,
        tone,
        naver_content: naverContent,
        thread_content: threadContent,
        naver_hashtags: naverHashtags,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB 저장 오류:", dbError);
      return NextResponse.json(
        { error: "글 저장 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: savedPost.id,
      naver_content: naverContent ?? undefined,
      thread_content: threadContent ?? undefined,
      naver_hashtags: naverHashtags ?? undefined,
    });
  } catch (error) {
    console.error("글 생성 오류:", error);
    const message =
      error instanceof Error ? error.message : "글 생성 중 오류가 발생했습니다.";
    return NextResponse.json(
      { error: message.includes("GEMINI") ? message : "글 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
