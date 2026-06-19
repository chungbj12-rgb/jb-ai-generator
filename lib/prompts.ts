// Gemini API에 전달할 플랫폼별 프롬프트 빌더
import {
  JB_BRAND_CONTEXT,
  JB_NAVER_OUTPUT_CHECKLIST,
} from "@/lib/prompts/jb-content-rules";
import {
  buildPlannerRolePrompt,
  JB_SPORTS_BLOG_STYLE_GUIDE,
} from "@/lib/prompts/jb-sports-blog-guide";
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

  return `${buildPlannerRolePrompt()}

${JB_BRAND_CONTEXT}

아래 **제목(주제)**으로 JB스포츠 배구센터 네이버 블로그 본문 전체를 작성하세요.
제목이 배구·배구학원·아이 운동과 관련 없어 보여도, 반드시 배구학원·학부모 관점으로 해석해 작성하세요.
배구와 무관한 여행·맛집·일반 정보 글은 절대 작성하지 마세요.

[확정 제목 — 본문은 이 제목에 맞게 작성]
${topic}

[작성 톤]
${TONE_DESCRIPTION[tone]} — JB스포츠: ~하십니다/~드립니다, 공손+대화체

${formatLengthBlock(bounds)}

${JB_NAVER_OUTPUT_CHECKLIST}

[JB스포츠 블로그 스타일 가이드 — 반드시 준수]
${JB_SPORTS_BLOG_STYLE_GUIDE}

[추가 지침]
${guideline.trim() || "(없음)"}

위 체크리스트·가이드·분량을 모두 반영하여 ${bounds.min}~${bounds.max}자 분량의 블로그 본문만 출력하세요.
제목·해시태그·JSON·설명 문구는 출력하지 마세요.`;
}

/** 1차 생성이 짧을 때 재생성용 */
export function buildNaverExpandPrompt(
  topic: string,
  tone: Tone,
  guideline: string,
  shortContent: string,
): string {
  const bounds = getNaverLengthBounds(guideline);

  return `${buildPlannerRolePrompt()}

${JB_BRAND_CONTEXT}

이전 JB스포츠 네이버 블로그 글이 너무 짧습니다(현재 ${shortContent.length}자).
반드시 ${bounds.min}자 이상 ${bounds.max}자 이하의 완성된 본문으로 처음부터 다시 작성하세요.

[확정 제목]
${topic}

[작성 톤]
${TONE_DESCRIPTION[tone]}

${formatLengthBlock(bounds)}

${JB_NAVER_OUTPUT_CHECKLIST}

[JB스포츠 블로그 스타일 가이드]
${JB_SPORTS_BLOG_STYLE_GUIDE}

[추가 지침]
${guideline.trim() || "(없음)"}

[참고 — 이전 초안(실패 사례, 그대로 쓰지 말 것)]
${shortContent}

${bounds.min}~${bounds.max}자 분량의 새 블로그 본문만 출력하세요.`;
}

export function buildThreadPrompt(
  topic: string,
  tone: Tone,
  guideline: string,
  options?: { fromKeyword?: boolean },
): string {
  const fromKeyword = options?.fromKeyword ?? false;
  const subjectBlock = fromKeyword
    ? `[키워드]\n${topic}\n\n위 키워드와 관련된 배구·아이 운동 맥락의 쓰레드 게시글을 작성하세요.`
    : `[주제]\n${topic}\n\n아래 주제로 배구·아이 운동 맥락의 쓰레드 게시글을 작성하세요.`;

  return `${JB_BRAND_CONTEXT}

당신은 JB스포츠 배구센터 쓰레드 콘텐츠 담당자입니다.
${subjectBlock}
배구와 무관한 내용 금지.

[작성 톤]
${TONE_DESCRIPTION[tone]}

[쓰레드 지침]
${guideline}

위 지침을 반영하여 쓰레드 게시글만 작성하세요. 추가 설명은 하지 마세요.`;
}
