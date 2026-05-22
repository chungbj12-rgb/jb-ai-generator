// Claude API에 전달할 플랫폼별 프롬프트 빌더
import { Tone } from "@/types";

const TONE_DESCRIPTION: Record<Tone, string> = {
  friendly:
    "친근하고 대화하듯 편안한 말투로, 이모지를 적절히 활용하여",
  professional:
    "전문적이고 신뢰감 있는 말투로, 데이터와 근거를 활용하여",
  emotional: "감성적이고 시적인 표현으로, 독자의 감정에 공감하며",
};

export function buildNaverPrompt(topic: string, tone: Tone): string {
  return `당신은 네이버 블로그 전문 작가입니다.
아래 주제로 네이버 블로그 포스팅을 작성해주세요.

[주제] ${topic}

[작성 조건]
- 톤: ${TONE_DESCRIPTION[tone]} 작성해주세요
- 분량: 800~1200자 내외
- 구성: 도입부 → 본문(소제목 3~4개, "## " 형식) → 마무리(CTA)
- 네이버 SEO를 위해 주요 키워드 자연스럽게 포함
- 첫 문장은 독자의 관심을 끄는 훅으로 시작

블로그 글만 작성하고 추가 설명은 하지 마세요.`;
}

export function buildThreadPrompt(topic: string, tone: Tone): string {
  return `당신은 쓰레드(Threads) 바이럴 콘텐츠 전문가입니다.
아래 주제로 쓰레드 게시글을 작성해주세요.

[주제] ${topic}

[작성 조건]
- 톤: ${TONE_DESCRIPTION[tone]} 작성해주세요
- 분량: 200~300자 내외 (짧고 임팩트 있게)
- 첫 줄: 스크롤을 멈추게 하는 강렬한 훅
- 줄바꿈으로 읽기 쉽게 구성
- 핵심 포인트는 번호 또는 이모지 리스트로 정리
- 마지막 줄: 공감/댓글 유도 CTA
- 해시태그 2~3개만 마지막에 추가

쓰레드 게시글만 작성하고 추가 설명은 하지 마세요.`;
}
