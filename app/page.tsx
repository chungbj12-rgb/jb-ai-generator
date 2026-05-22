import { redirect } from "next/navigation";

/** 루트 접속 시 생성 페이지로 이동 */
export default function HomePage() {
  redirect("/generate");
}
