// Gemini API에 전달할 플랫폼별 프롬프트 빌더
import {
  getNaverLengthBounds,
  type NaverLengthBounds,
} from "@/lib/naver-length";
import { Tone } from "@/types";

const TONE_DESCRIPTION: Record<Tone, string> = {
  friendly:
    "친근하고 대화하듯 편안한 말투로, 이모지를 적절히 활용하여",
  professional:
    "전문적이고 신뢰감 있는 말투로, 데이터와 근거를 활용하여",
  emotional: "감성적이고 시적인 표현으로, 독자의 감정에 공감하며",
};

function formatLengthBlock(bounds: NaverLengthBounds): string {
  return `[본문 분량 — 최우선 준수]
- 공백·줄바꿈을 포함한 본문 전체 글자 수는 반드시 ${bounds.min}자 이상 ${bounds.max}자 이하입니다.
- ${bounds.min}자 미만의 짧은 글, 요약만, 목차만, 메타 설명은 절대 출력하지 마세요.
- 서론·본문(여러 소제목)·마무리가 있는 완성된 풀 포스팅 한 편을 작성하세요.`;
}

export function buildNaverPrompt(
  topic: string,
  tone: Tone,
  guideline: string,
): string {
  const bounds = getNaverLengthBounds(guideline);

  return `당신은 네이버 블로그 전문 작가입니다.
아래 주제로 네이버 블로그 포스팅 본문 전체를 작성해주세요.

[주제]
${topic}

[작성 톤]
${TONE_DESCRIPTION[tone]}

${formatLengthBlock(bounds)}

[네이버 블로그 최적화 지침 — 반드시 준수]
${guideline}

위 지침과 본문 분량을 모두 철저히 반영하여, ${bounds.min}~${bounds.max}자 분량의 블로그 본문만 출력하세요. 제목·해시태그·부가 설명은 쓰지 마세요.`;
}

/** 1차 생성이 짧을 때 재생성용 */
export function buildNaverExpandPrompt(
  topic: string,
  tone: Tone,
  guideline: string,
  shortContent: string,
): string {
  const bounds = getNaverLengthBounds(guideline);

  return `이전에 생성한 네이버 블로그 글이 너무 짧습니다(현재 ${shortContent.length}자).
반드시 ${bounds.min}자 이상 ${bounds.max}자 이하의 완성된 본문으로 처음부터 다시 작성하세요.

[주제]
${topic}

[작성 톤]
${TONE_DESCRIPTION[tone]}

${formatLengthBlock(bounds)}

[네이버 블로그 최적화 지침]
${guideline}

[참고 — 이전 초안(이 분량은 실패 사례, 그대로 쓰지 말 것)]
${shortContent}

${bounds.min}~${bounds.max}자 분량의 새 블로그 본문만 출력하세요.`;
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
