import { NextRequest, NextResponse } from "next/server";

export type Platform = "naver" | "threads";
export type Tone = "friendly" | "professional" | "emotional";

const TONE_LABEL: Record<Tone, string> = {
  friendly: "친근하게",
  professional: "전문적으로",
  emotional: "감성적으로",
};

const PLATFORM_LABEL: Record<Platform, string> = {
  naver: "네이버 블로그",
  threads: "쓰레드",
};

/** 플랫폼·톤에 맞는 시스템 프롬프트 */
function buildSystemPrompt(platform: Platform, tone: Tone): string {
  const platformGuide =
    platform === "naver"
      ? "네이버 블로그용으로 소제목과 본문 단락을 나누어 읽기 쉽게 작성하세요."
      : "쓰레드용으로 짧은 문단과 줄바꿈을 활용해 모바일에서 읽기 좋게 작성하세요.";

  const toneGuide =
    tone === "friendly"
      ? "친근하고 대화하듯 쓰세요."
      : tone === "professional"
        ? "전문적이고 신뢰감 있는 어조로 쓰세요."
        : "감성적이고 여운이 남는 표현을 사용하세요.";

  return `당신은 한국어 블로그/소셜 글 작성 전문가입니다. ${platformGuide} ${toneGuide} 이모지는 과하지 않게 사용하세요.`;
}

/** API 키 없을 때 사용하는 샘플 글 */
function mockContent(topic: string, platform: Platform, tone: Tone): string {
  const intro =
    tone === "emotional"
      ? `오늘은 "${topic}"에 대해 마음을 담아 적어봅니다.`
      : tone === "professional"
        ? `"${topic}"에 대해 핵심만 정리해 드립니다.`
        : `안녕하세요! 오늘은 "${topic}" 이야기를 해볼게요.`;

  if (platform === "threads") {
    return `${intro}\n\n요즘 많이 찾는 주제죠.\n한 줄 요약: ${topic} — 직접 경험해 보니 생각보다 만족스러웠어요.\n\n궁금한 점 있으면 댓글로 알려주세요!`;
  }

  return `${intro}\n\n## 왜 ${topic}인가요?\n\n최근 관심이 높아진 주제입니다. 직접 다녀와 보니 기대 이상이었고, 공유할 가치가 충분하다고 느꼈습니다.\n\n## 핵심 포인트\n\n- 첫인상이 좋았습니다\n- 가성비와 분위기의 균형이 괜찮습니다\n- 다시 방문하고 싶은 곳입니다\n\n## 마무리\n\n${topic}에 관심 있으시다면 한번 가보시길 추천드립니다. 도움이 되셨다면 공감과 댓글 부탁드려요!`;
}

/** Claude(Anthropic) API로 글 생성 */
async function generateWithClaude(
  topic: string,
  platform: Platform,
  tone: Tone,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const userPrompt = `주제: ${topic}\n플랫폼: ${PLATFORM_LABEL[platform]}\n톤: ${TONE_LABEL[tone]}\n\n위 조건에 맞는 글을 작성해 주세요.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: buildSystemPrompt(platform, tone),
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Anthropic error:", err);
    throw new Error("claude_api_failed");
  }

  const data = await res.json();
  const block = data.content?.find(
    (c: { type: string }) => c.type === "text",
  );
  return block?.text?.trim() ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const topic = String(body.topic ?? "").trim();
    const platform = (body.platform ?? "naver") as Platform;
    const tone = (body.tone ?? "friendly") as Tone;

    if (!topic) {
      return NextResponse.json(
        { error: "주제를 입력해 주세요." },
        { status: 400 },
      );
    }

    try {
      const content = await generateWithClaude(topic, platform, tone);

      if (content) {
        return NextResponse.json({ content });
      }
    } catch {
      return NextResponse.json(
        { error: "AI 생성에 실패했습니다. API 키를 확인해 주세요." },
        { status: 502 },
      );
    }

    // API 키 없으면 데모용 샘플 반환
    await new Promise((r) => setTimeout(r, 1200));
    return NextResponse.json({
      content: mockContent(topic, platform, tone),
    });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
