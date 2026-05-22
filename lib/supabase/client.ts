// 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트
import { createBrowserClient } from "@supabase/ssr";

/** Supabase 공개 환경변수 설정 여부 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return createBrowserClient(url, key);
}

/** 설정된 경우에만 클라이언트 생성 (없으면 null) */
export function createClientSafe() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}
