import DashboardShell from "@/components/layout/DashboardShell";
import AutomateForm from "@/components/agent/AutomateForm";

export const metadata = {
  title: "블로그 자동화 | JBAI",
};

export default function AutomatePage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-1 text-xl font-bold text-gray-900">블로그 자동화</h1>
        <p className="mb-6 text-sm text-gray-500">
          주제 입력 → AI 콘텐츠·이미지 생성 → 네이버 임시저장
        </p>
        <AutomateForm />
      </div>
    </DashboardShell>
  );
}
