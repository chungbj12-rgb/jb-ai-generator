// 지침 조회(GET) / 수정(PUT) API
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { platform, title, content } = await request.json();
  if (!platform || !content) {
    return NextResponse.json({ error: "필수 값 누락" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("prompt_guidelines")
    .update({
      title,
      content,
      updated_at: new Date().toISOString(),
      updated_by: user.email,
    })
    .eq("platform", platform)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "지침 수정 실패" }, { status: 500 });
  }

  return NextResponse.json({ guideline: data });
}
