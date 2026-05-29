// Gemini API로 주제/제목 추천
import { NextRequest, NextResponse } from "next/server";
import { generateText, isGeminiConfigured } from "@/lib/gemini";
import { parseTopicsFromText } from "@/lib/parse-topics";
import { Platform } from "@/types";

/** 쓰레드용 샘플 주제 */
function mockThreadTopics(keyword: string): string[] {
  return [
    `${keyword} 완벽 가이드 — 초보자도 쉽게 따라하는 방법`,
    `2025년 최신 ${keyword} 트렌드와 꿀팁 총정리`,
    `직접 경험한 ${keyword} 후기 — 솔직한 장단점`,
    `${keyword} 추천 TOP 5 — 현지인만 아는 숨은 정보`,
    `${keyword} 시작하기 전에 꼭 알아야 할 3가지`,
  ];
}

/** 네이버 블로그용 샘플 제목 */
function mockNaverTitles(keyword: string): string[] {
  return [
    `${keyword} 완벽 가이드｜초보자도 따라하는 7가지 방법`,
    `2025년 최신 ${keyword} 총정리｜꿀팁 TOP 10`,
    `직접 다녀온 ${keyword} 후기｜솔직 장단점`,
    `${keyword} 추천 BEST 5｜현지인만 아는 곳`,
    `${keyword} 전에 꼭 알아야 할 3가지`,
    `${keyword} 비용·일정·준비물 한눈에 보기`,
    `${keyword} 실패 없는 선택 기준｜전문가 팁`,
    `요즘 핫한 ${keyword} 트렌드｜검색 1위 비결`,
    `${keyword} 초보 vs 고수｜이것만은 꼭 챙기세요`,
    `${keyword} 후기 모음｜실사용자 추천 순위`,
  ];
}

function buildSuggestPrompt(keyword: string, platform: Platform): string {
  if (platform === "naver") {
    return `키워드: "${keyword}"

위 키워드로 **네이버 블로그 상위노출**에 유리한 **글 제목 10개**를 추천해 주세요.

조건:
- 제목 길이 25~35자 권장
- 핵심 키워드를 제목 앞부분에 배치
- 숫자·후킹·검색 의도 반영 (예: ~하는 방법, ~추천, ~후기, TOP N)
- 클릭해서 바로 글 제목으로 쓸 수 있게 구체적으로
- JSON 배열 10개만 출력 (마크다운 코드블록 없이)
예: ["제목1", "제목2", "제목3", "제목4", "제목5", "제목6", "제목7", "제목8", "제목9", "제목10"]`;
  }

  return `키워드: "${keyword}"

위 키워드로 쓰레드(Threads)에 적합한 글 주제 5개를 추천해 주세요.
각 주제는 한 줄로, 클릭해서 바로 글 생성에 쓸 수 있게 구체적으로 작성하세요.
반드시 JSON 배열만 출력하세요. 마크다운 코드블록 없이.
예: ["주제1", "주제2", "주제3", "주제4", "주제5"]`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = String(body.keyword ?? "").trim();
    const platform: Platform =
      body.platform === "thread" ? "thread" : "naver";

    if (!keyword) {
      return NextResponse.json(
        { error: "키워드를 입력해 주세요." },
        { status: 400 },
      );
    }

    const limit = platform === "naver" ? 10 : 5;
    const mock =
      platform === "naver"
        ? mockNaverTitles(keyword)
        : mockThreadTopics(keyword);

    if (!isGeminiConfigured()) {
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({ topics: mock, platform });
    }

    const text = await generateText(buildSuggestPrompt(keyword, platform));
    const topics = parseTopicsFromText(text, limit);

    if (topics?.length) {
      return NextResponse.json({ topics, platform });
    }

    return NextResponse.json({ topics: mock, platform });
  } catch (error) {
    console.error("주제 추천 오류:", error);
    return NextResponse.json(
      { error: "주제 추천 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
