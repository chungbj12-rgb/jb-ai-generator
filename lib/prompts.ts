// Claude API에 전달할 플랫폼별 프롬프트 빌더
import { Tone } from "@/types";

const TONE_DESCRIPTION: Record<Tone, string> = {
  friendly:
    "친근하고 대화하듯 편안한 말투로, 이모지를 적절히 활용하여",
  professional:
    "전문적이고 신뢰감 있는 말투로, 데이터와 근거를 활용하여",
  emotional: "감성적이고 시적인 표현으로, 독자의 감정에 공감하며",
};

export function buildNaverPrompt(
  topic: string,
  tone: Tone,
  guideline: string,
): string {
  return `당신은 네이버 블로그 전문 작가입니다.
아래 주제로 네이버 블로그 포스팅을 작성해주세요.

[주제]
${topic}

[작성 톤]
${TONE_DESCRIPTION[tone]}

[네이버 블로그 최적화 지침 — 반드시 준수]
${guideline}

위 지침을 철저히 반영하여 블로그 글만 작성하세요. 추가 설명은 하지 마세요.`;
}

export function buildThreadPrompt(
  topic: string,
  tone: Tone,
  guideline: string,
): string {
  return `당신은 쓰레드(Threads) 바이럴 콘텐츠 전문가입니다.
아래 주제로 쓰레드 게시글을 작성해주세요.

[주제]
${topic}

[작성 톤]
${TONE_DESCRIPTION[tone]}

[쓰레드 바이럴 최적화 지침 — 반드시 준수]
${guideline}

위 지침을 철저히 반영하여 쓰레드 게시글만 작성하세요. 추가 설명은 하지 마세요.`;
}
