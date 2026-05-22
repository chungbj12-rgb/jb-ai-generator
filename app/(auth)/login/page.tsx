import type { Metadata } from "next";
import AuthForm, { LoginBrandPanel } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "로그인 | AI 블로그 생성기",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f0f2] p-4 sm:p-8">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* 좌측 브랜딩 */}
        <div className="hidden w-1/2 md:block">
          <LoginBrandPanel />
        </div>

        {/* 우측 로그인 폼 */}
        <div className="w-full md:w-1/2">
          <AuthForm />
        </div>
      </div>
    </div>
  );
}
