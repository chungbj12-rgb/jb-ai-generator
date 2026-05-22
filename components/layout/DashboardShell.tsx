import Header from "@/components/ui/Header";
import Sidebar from "@/components/ui/Sidebar";

interface DashboardShellProps {
  userEmail?: string;
  children: React.ReactNode;
}

/** 헤더 + 사이드바 + 메인 영역 공통 레이아웃 */
export default function DashboardShell({
  userEmail,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <Header userEmail={userEmail} />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar />
        <main className="min-h-[calc(100vh-3.5rem)] flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
