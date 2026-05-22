import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Platform, PostInsert, Tone } from "@/lib/types/post";

const PLATFORMS: Platform[] = ["naver", "threads"];
const TONES: Tone[] = ["friendly", "professional", "emotional"];

function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && PLATFORMS.includes(v as Platform);
}

function isTone(v: unknown): v is Tone {
  return typeof v === "string" && TONES.includes(v as Tone);
}

/** 생성 글 저장 (POST) / 목록 조회 (GET) */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const topic = String(body.topic ?? "").trim();
    const platform = body.platform;
    const tone = body.tone;
    const content = String(body.content ?? "").trim();

    if (!topic) {
      return NextResponse.json(
        { error: "주제가 없습니다." },
        { status: 400 },
      );
    }
    if (!content) {
      return NextResponse.json(
        { error: "저장할 글이 없습니다." },
        { status: 400 },
      );
    }
    if (!isPlatform(platform) || !isTone(tone)) {
      return NextResponse.json(
        { error: "플랫폼 또는 톤 값이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const row: PostInsert = { topic, platform, tone, content };

    const { data, error } = await supabase
      .from("posts")
      .insert(row)
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        {
          error:
            "DB 저장에 실패했습니다. Supabase에서 posts 테이블 SQL을 실행했는지 확인해 주세요.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: data.id,
      createdAt: data.created_at,
    });
  } catch {
    return NextResponse.json(
      { error: "요청 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

/** 최근 저장 글 목록 (최대 50건) */
export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id, topic, platform, tone, content, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Supabase select error:", error);
    return NextResponse.json(
      { error: "목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ posts: data ?? [] });
}
