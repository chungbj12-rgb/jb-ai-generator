// AI 텍스트 생성 → 글 생성 → Supabase 저장
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/supabase/api-auth";
import {
  generateBlogText,
  isProviderConfigured,
  type TextProvider,
} from "@/lib/llm";
import { generateNaverBlogContent } from "@/lib/naver-content";
import { generateNaverHashtags } from "@/lib/naver-hashtags";
import { resolveNaverGuideline } from "@/lib/prompts/resolve-naver-guideline";
import { buildThreadPrompt } from "@/lib/prompts";
import { GenerateRequest } from "@/types";

export const maxDuration = 300;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { tone, platform } = body;
    const textProvider: TextProvider =
      body.textProvider === "openai" ? "openai" : "gemini";
    const keyword = String(body.keyword ?? "").trim();
    const topicInput = String(body.topic ?? "").trim();

    const topic =
      platform === "thread"
        ? topicInput || keyword
        : topicInput;

    if (!topic || !tone || !platform) {
      return NextResponse.json(
        {
          error:
            platform === "thread"
              ? "키워드, 톤, 플랫폼은 필수 입력 항목입니다."
              : "주제, 톤, 플랫폼은 필수 입력 항목입니다.",
        },
        { status: 400 },
      );
    }

    if (platform !== "naver" && platform !== "thread") {
      return NextResponse.json(
        { error: "플랫폼은 네이버 또는 쓰레드 중 하나만 선택할 수 있습니다." },
        { status: 400 },
      );
    }

    const { user, supabase, authError } = await getApiAuth(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    if (!isProviderConfigured(textProvider)) {
      const keyName =
        textProvider === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY";
      return NextResponse.json(
        { error: `${keyName}가 설정되지 않았습니다.` },
        { status: 503 },
      );
    }

    const naverGuidelineText = await resolveNaverGuideline(supabase);

    const { data: threadGuideline } = await supabase
      .from("prompt_guidelines")
      .select("content")
      .eq("platform", "thread")
      .single();

    const threadGuidelineText = threadGuideline?.content ?? "";

    let naverContent: string | null = null;
    let threadContent: string | null = null;
    let naverHashtags: string[] | null = null;
    const threadSubject = keyword || topic;

    if (platform === "naver") {
      naverContent = await generateNaverBlogContent(
        topic,
        tone,
        naverGuidelineText,
        textProvider,
      );
      naverHashtags = await generateNaverHashtags(
        topic,
        naverContent,
        textProvider,
      );
    }

    if (platform === "thread") {
      threadContent = await generateBlogText(
        buildThreadPrompt(threadSubject, tone, threadGuidelineText, {
          fromKeyword: Boolean(keyword),
        }),
        textProvider,
      );
    }

    const { data: savedPost, error: dbError } = await supabase
      .from("blog_posts")
      .insert({
        user_id: user.id,
        topic: platform === "thread" ? threadSubject : topic,
        tone,
        keyword: keyword || null,
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
      topic,
      naver_content: naverContent ?? undefined,
      thread_content: threadContent ?? undefined,
      naver_hashtags: naverHashtags ?? undefined,
      textProvider,
    });
  } catch (error) {
    console.error("글 생성 오류:", error);
    const message =
      error instanceof Error ? error.message : "글 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
