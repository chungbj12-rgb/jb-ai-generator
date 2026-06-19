import fs from "fs";
import path from "path";
import { JB_SPORTS_NAVER_GUIDELINE_DB } from "@/lib/prompts/jb-sports-blog-guide";

const sql = `-- JB스포츠 네이버 블로그 가이드로 prompt_guidelines 업데이트
UPDATE prompt_guidelines
SET
  title = 'JB스포츠 배구센터 블로그 스타일 가이드',
  content = $jb$${JB_SPORTS_NAVER_GUIDELINE_DB}$jb$,
  updated_at = NOW()
WHERE platform = 'naver';
`;

const outPath = path.join(
  process.cwd(),
  "supabase/migrations/20260528120000_jb_sports_naver_guideline.sql",
);
fs.writeFileSync(outPath, sql, "utf8");
console.log(`Migration written: ${outPath} (${sql.length} bytes)`);
