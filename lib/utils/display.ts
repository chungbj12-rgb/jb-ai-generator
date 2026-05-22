/** 이메일에서 화면 표시용 이름 추출 */
export function getDisplayName(email?: string | null): string {
  if (!email) return "사용자";
  return email.split("@")[0] ?? "사용자";
}

/** 날짜 포맷: YYYY.MM.DD */
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
