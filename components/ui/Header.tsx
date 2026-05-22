"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { createClientSafe, isSupabaseConfigured } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/utils/display";

interface HeaderProps {
  userEmail?: string;
}

export default function Header({ userEmail }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const displayName = getDisplayName(userEmail);
  const initial = displayName.charAt(0).toUpperCase();

  const tabs = [
    { href: "/generate", label: "글 생성" },
    { href: "/history", label: "히스토리" },
  ];

  async function handleLogout() {
    if (!isSupabaseConfigured()) {
      router.push("/login");
      return;
    }
    const supabase = createClientSafe();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto grid h-14 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center px-6">
        <Link href="/generate">
          <Logo />
        </Link>

        <nav className="flex items-center gap-10">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`pb-0.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-b-2 border-indigo-600 text-indigo-700"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {initial}
            </span>
            <span className="hidden text-sm font-medium text-gray-800 sm:block">
              {displayName}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="로그아웃"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
