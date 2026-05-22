/** DB posts 테이블과 맞춘 타입 */
export type Platform = "naver" | "threads";
export type Tone = "friendly" | "professional" | "emotional";

export interface PostRow {
  id: string;
  topic: string;
  platform: Platform;
  tone: Tone;
  content: string;
  created_at: string;
}

export interface PostInsert {
  topic: string;
  platform: Platform;
  tone: Tone;
  content: string;
}
