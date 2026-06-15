/** .env.local + example → agent.config.local.json 동기화 */
import fs from "fs";
import path from "path";
import { loadEnvLocal } from "@/lib/agent/load-env";

loadEnvLocal();

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const root = process.cwd();
const example = JSON.parse(
  fs.readFileSync(path.join(root, "agent.config.example.json"), "utf8"),
) as Record<string, unknown>;

const env = parseEnvFile(path.join(root, ".env.local"));

const config = {
  ...example,
  naverId: env.NAVER_ID || example.naverId,
  naverPassword: env.NAVER_PASSWORD || example.naverPassword,
  blogId: env.NAVER_BLOG_ID || example.blogId,
  topic: env.AGENT_TOPIC || example.topic,
  keyword: env.AGENT_KEYWORD || example.keyword,
  firstSentence: env.AGENT_FIRST_SENTENCE || example.firstSentence,
  ctaText: env.AGENT_CTA_TEXT || example.ctaText,
  ctaButtonText: env.AGENT_CTA_BUTTON_TEXT || example.ctaButtonText,
  ctaButtonLink: env.AGENT_CTA_BUTTON_LINK || example.ctaButtonLink,
  textModel: env.AGENT_TEXT_MODEL || example.textModel,
  imageModel: env.AGENT_IMAGE_MODEL || example.imageModel,
  apiKey: env.AGENT_API_KEY || "",
  geminiApiKey: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
  openaiApiKey: env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
  tone: env.AGENT_TONE || example.tone,
  imageCount: env.AGENT_IMAGE_COUNT
    ? Number(env.AGENT_IMAGE_COUNT)
    : example.imageCount,
};

const outPath = path.join(root, "agent.config.local.json");
fs.writeFileSync(outPath, JSON.stringify(config, null, 2), "utf8");
console.log(`agent.config.local.json 생성 완료: ${outPath}`);
