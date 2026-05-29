import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import GuidelineEditor from "@/components/admin/GuidelineEditor";
import { createClient } from "@/lib/supabase/server";
import { PromptGuideline } from "@/types";

export default async function GuidelinesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: guidelines, error } = await supabase
    .from("prompt_guidelines")
    .select("*")
    .order("platform");

  if (error) {
    console.error("지침 조회 오류:", error);
  }

  return (
    <DashboardShell userEmail={user.email}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">프롬프트 지침 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          네이버 블로그 SEO 최적화 및 쓰레드 바이럴 지침을 관리합니다. 글자 수
          제한 없이 저장되며, 저장 즉시 글 생성에 반영됩니다.
        </p>
      </div>

      <GuidelineEditor
        guidelines={(guidelines ?? []) as PromptGuideline[]}
      />
    </DashboardShell>
  );
}
