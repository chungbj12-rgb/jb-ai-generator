"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  History,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

const MENU = [
  { href: "/generate", label: "글 생성", icon: Sparkles },
  { href: "/history", label: "히스토리", icon: History },
  { href: "/history", label: "팀원 글 보기", icon: Users },
];

/** 대시보드 좌측 사이드바 */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white lg:block">
      <div className="flex h-[calc(100vh-3.5rem)] flex-col px-4 py-6">
        <p className="mb-3 px-2 text-xs font-medium text-gray-400">메뉴</p>

        <nav className="space-y-1">
          {MENU.map((item, idx) => {
            const Icon = item.icon;
            const active =
              idx === 0
                ? pathname.startsWith("/generate")
                : idx === 1
                  ? pathname.startsWith("/history")
                  : false;

            return (
              <Link
                key={`${item.label}-${idx}`}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="my-4 border-t border-gray-100" />

        <button
          type="button"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800"
        >
          <Settings className="h-4 w-4" />
          설정
        </button>
      </div>
    </aside>
  );
}
