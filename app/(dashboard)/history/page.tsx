import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import HistoryList from "@/components/blog/HistoryList";
import { createClient } from "@/lib/supabase/server";
import { BlogPost } from "@/types";

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("히스토리 조회 오류:", error);
  }

  const blogPosts = (posts ?? []) as BlogPost[];

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekCount = blogPosts.filter(
    (p) => new Date(p.created_at) >= weekAgo,
  ).length;

  return (
    <DashboardShell userEmail={user.email}>
      {/* 통계 카드 — 베이지 톤 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "총 생성 글", value: String(blogPosts.length) },
          { label: "이번 주", value: String(thisWeekCount) },
          { label: "팀원 수", value: "1" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-stone-200/80 bg-[#faf8f5] px-5 py-4"
          >
            <p className="text-xs font-semibold text-gray-600">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <HistoryList posts={blogPosts} authorEmail={user.email} />
    </DashboardShell>
  );
}
