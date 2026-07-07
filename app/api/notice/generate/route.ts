import { NextRequest, NextResponse } from "next/server";
import { generateNoticeContent } from "@/lib/notice/generate-notice";
import { MAX_NOTICE_IMAGES } from "@/lib/notice/constants";
import { generateNaverHashtags } from "@/lib/naver-hashtags";
import { getApiAuth } from "@/lib/supabase/api-auth";
import { isGeminiConfigured } from "@/lib/gemini";
import type { NoticeImageInput, NoticeType, Tone } from "@/types";

export const maxDuration = 300;

const VALID_NOTICE_TYPES = new Set<NoticeType>([
  "new_class",
  "announcement",
  "event",
  "general",
]);

function stripDataUrl(images: unknown): NoticeImageInput[] {
  if (!Array.isArray(images)) return [];
  const out: NoticeImageInput[] = [];
  for (const img of images.slice(0, MAX_NOTICE_IMAGES)) {
    const row = img as NoticeImageInput;
    const mimeType = String(row.mimeType ?? "image/jpeg");
    const data = String(row.data ?? "").trim();
    if (!data) continue;
    out.push({
      mimeType,
      data: data.replace(/^data:[^;]+;base64,/, ""),
      name: row.name,
    });
  }
  return out;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = String(body.title ?? body.topic ?? "").trim();
    const sourceInfo = String(body.sourceInfo ?? body.info ?? "").trim();
    const noticeType = VALID_NOTICE_TYPES.has(body.noticeType)
      ? (body.noticeType as NoticeType)
      : "general";
    const tone = (body.tone ?? "friendly") as Tone;
    const images = stripDataUrl(body.images);

    if (!title) {
      return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    }
    if (!sourceInfo) {
      return NextResponse.json(
        { error: "안내 정보(일정·대상·내용 등)를 입력해 주세요." },
        { status: 400 },
      );
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 503 },
      );
    }

    const { user, supabase, authError } = await getApiAuth(request);
    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const result = await generateNoticeContent({
      noticeType,
      title,
      sourceInfo,
      images,
      tone,
    });

    let naverHashtags: string[] | undefined;
    try {
      naverHashtags = await generateNaverHashtags(title, result.body, "gemini");
    } catch (tagError) {
      console.error("공지 해시태그 생성 실패:", tagError);
    }

    const { data: savedPost, error: dbError } = await supabase
      .from("blog_posts")
      .insert({
        user_id: user.id,
        topic: title,
        tone,
        keyword: title,
        naver_content: result.body,
        naver_hashtags: naverHashtags ?? null,
        pipeline_status: "completed",
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("공지 글 저장 오류:", dbError);
      return NextResponse.json(
        { error: "글 저장 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: savedPost.id,
      title: result.title,
      topic: result.title,
      keyword: title,
      naver_content: result.body,
      naver_hashtags: naverHashtags,
      notice_type: noticeType,
      used_images: result.used_images,
      pipeline: {
        status: "completed",
        char_count: result.char_count,
        total_cost_usd: 0,
      },
    });
  } catch (error) {
    console.error("공지 글 생성 오류:", error);
    const message =
      error instanceof Error ? error.message : "글 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
