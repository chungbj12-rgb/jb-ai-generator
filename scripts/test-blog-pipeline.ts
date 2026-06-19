/**
 * 2단계 블로그 파이프라인 로컬 테스트
 * 사용: npm run pipeline:test -- "수지 배구학원" "수지 초등 배구학원 선택 가이드"
 */
import { generateBlogPost } from "../blog-automation/lib/pipeline";

async function main() {
  const keyword = process.argv[2]?.trim() || "수지 배구학원";
  const topic =
    process.argv[3]?.trim() || "수지에서 초등 배구학원 고를 때 꼭 확인할 것";

  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error("GEMINI_API_KEY가 필요합니다.");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("OPENAI_API_KEY가 필요합니다.");
    process.exit(1);
  }

  console.log(`키워드: ${keyword}`);
  console.log(`주제: ${topic}`);
  console.log("2단계 파이프라인 실행 중...\n");

  const result = await generateBlogPost(keyword, topic);

  console.log("=== 결과 ===");
  console.log(`제목: ${result.title}`);
  console.log(`글자수: ${result.char_count} (${result.status})`);
  console.log(`총 비용(USD): $${result.total_cost_usd.toFixed(6)}`);
  console.log("\n--- 단계별 비용 ---");
  for (const s of result.stage_costs) {
    console.log(
      `Stage ${s.stage} (${s.provider}/${s.model}): in=${s.inputTokens} out=${s.outputTokens} → $${s.costUsd.toFixed(6)}`,
    );
  }
  console.log("\n--- 본문 ---\n");
  console.log(result.final_body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
