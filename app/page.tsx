// 루트 경로 접근 시 로그인 상태에 따라 리다이렉트
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/generate");
  else redirect("/login");
}
