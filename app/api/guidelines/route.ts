// 지침 조회(GET) / 수정(PUT) API — 길이 제한 없음
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");

  let query = supabase.from("prompt_guidelines").select("*").order("platform");
  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;
  if (error) {
    console.error("지침 조회 오류:", error);
    return NextResponse.json({ error: "지침 조회 실패" }, { status: 500 });
  }

  return NextResponse.json({ guidelines: data });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { platform?: string; title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 읽을 수 없습니다. 용량이 너무 크면 나눠 저장해 주세요." },
      { status: 413 },
    );
  }

  const platform = String(body.platform ?? "").trim();
  if (!platform) {
    return NextResponse.json({ error: "platform은 필수입니다." }, { status: 400 });
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : platform === "naver"
        ? "네이버 블로그 SEO 최적화 지침"
        : "쓰레드 바이럴 콘텐츠 지침";

  // 빈 문자열 포함 모든 길이 허용
  const content = typeof body.content === "string" ? body.content : "";

  const { data, error } = await supabase
    .from("prompt_guidelines")
    .upsert(
      {
        platform,
        title,
        content,
        updated_at: new Date().toISOString(),
        updated_by: user.email,
      },
      { onConflict: "platform" },
    )
    .select()
    .single();

  if (error) {
    console.error("지침 저장 오류:", error);
    return NextResponse.json(
      { error: `지침 저장 실패: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    guideline: data,
    meta: { length: content.length },
  });
}
