import fs from "fs";
import path from "path";
import { JB_SPORTS_NAVER_GUIDELINE_DB } from "../lib/prompts/jb-sports-blog-guide";

const sql = `-- 인사말·연락처 업데이트 (제이비스포츠 배구전문센터 / 010-3397-5866)
UPDATE prompt_guidelines
SET
  title = 'JB스포츠 배구센터 블로그 스타일 가이드',
  content = $jb$${JB_SPORTS_NAVER_GUIDELINE_DB}$jb$,
  updated_at = NOW()
WHERE platform = 'naver';
`;

const outPath = path.join(
  process.cwd(),
  "supabase/migrations/20260622120000_jb_greeting_contact.sql",
);
fs.writeFileSync(outPath, sql, "utf8");
console.log(`Migration written: ${outPath}`);
