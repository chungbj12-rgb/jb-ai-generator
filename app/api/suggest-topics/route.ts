// Gemini API로 블로그 주제 추천
import { NextRequest, NextResponse } from "next/server";
import { generateText, isGeminiConfigured } from "@/lib/gemini";

/** API 키 없을 때 사용하는 샘플 주제 */
function mockTopics(keyword: string): string[] {
  return [
    `${keyword} 완벽 가이드 — 초보자도 쉽게 따라하는 방법`,
    `2025년 최신 ${keyword} 트렌드와 꿀팁 총정리`,
    `직접 경험한 ${keyword} 후기 — 솔직한 장단점`,
    `${keyword} 추천 TOP 5 — 현지인만 아는 숨은 정보`,
    `${keyword} 시작하기 전에 꼭 알아야 할 3가지`,
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = String(body.keyword ?? "").trim();

    if (!keyword) {
      return NextResponse.json(
        { error: "키워드를 입력해 주세요." },
        { status: 400 },
      );
    }

    if (!isGeminiConfigured()) {
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({ topics: mockTopics(keyword) });
    }

    const text = await generateText(`키워드: "${keyword}"

위 키워드로 네이버 블로그·쓰레드에 적합한 글 주제 5개를 추천해 주세요.
각 주제는 한 줄로, 클릭해서 바로 글 생성에 쓸 수 있게 구체적으로 작성하세요.
JSON 배열만 반환하세요. 예: ["주제1", "주제2", "주제3", "주제4", "주제5"]`);

    try {
      const parsed = JSON.parse(text) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return NextResponse.json({ topics: parsed.slice(0, 5) });
      }
    } catch {
      const lines = text
        .split("\n")
        .map((l) => l.replace(/^[\d.\-"'\s]+/, "").trim())
        .filter((l) => l.length > 5);
      if (lines.length > 0) {
        return NextResponse.json({ topics: lines.slice(0, 5) });
      }
    }

    return NextResponse.json({ topics: mockTopics(keyword) });
  } catch (error) {
    console.error("주제 추천 오류:", error);
    return NextResponse.json(
      { error: "주제 추천 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
