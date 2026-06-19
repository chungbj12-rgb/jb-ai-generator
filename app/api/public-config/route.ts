import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 패키징 클라이언트용 공개 설정 (anon key는 클라이언트 노출용) */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  return NextResponse.json({
    apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "",
    supabaseUrl,
    supabaseAnonKey,
    appName: "JB스포츠 AI 블로그 생성기",
  });
}
