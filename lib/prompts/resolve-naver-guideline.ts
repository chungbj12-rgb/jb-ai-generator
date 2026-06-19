import type { SupabaseClient } from "@supabase/supabase-js";
import { JB_SPORTS_NAVER_GUIDELINE_DB } from "@/lib/prompts/jb-sports-blog-guide";

/** Supabase prompt_guidelines(naver) 조회 — 없으면 코드 기본값 */
export async function resolveNaverGuideline(
  supabase?: SupabaseClient,
): Promise<string> {
  if (!supabase) return JB_SPORTS_NAVER_GUIDELINE_DB;

  const { data, error } = await supabase
    .from("prompt_guidelines")
    .select("content")
    .eq("platform", "naver")
    .single();

  if (error) {
    console.warn("prompt_guidelines 조회 실패, 기본 지침 사용:", error.message);
    return JB_SPORTS_NAVER_GUIDELINE_DB;
  }

  const content = data?.content?.trim();
  return content || JB_SPORTS_NAVER_GUIDELINE_DB;
}
