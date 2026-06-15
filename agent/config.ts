import path from "path";

export const AGENT_OUTPUT_ROOT =
  process.env.AGENT_OUTPUT_DIR?.trim() ||
  path.join(process.cwd(), "agent-output");

export const NAVER_SESSION_DIR =
  process.env.NAVER_SESSION_DIR?.trim() ||
  path.join(process.cwd(), ".naver-session");

export const NAVER_LOGIN_URL = "https://nid.naver.com/nidlogin.login";

export function getNaverWriteUrl(blogId: string): string {
  return blogId
    ? `https://blog.naver.com/${blogId}/postwrite`
    : "https://blog.naver.com/PostWriteForm.naver";
}

export const AGENT_TIMEOUTS = {
  navigation: 60_000,
  editor: 30_000,
  upload: 45_000,
  login: 300_000,
} as const;
