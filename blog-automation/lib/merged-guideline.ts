import {
  JB_BRAND_CONTEXT,
  JB_NAVER_OUTPUT_CHECKLIST,
} from "@/lib/prompts/jb-content-rules";
import {
  JB_INTRO_OPENING,
  JB_SPORTS_BLOG_STYLE_GUIDE,
} from "@/lib/prompts/jb-sports-blog-guide";

/** 도입부 학부모 공감 질문 — 인사말 직후 필수 */
export const JB_PARENT_EMPATHY_QUESTIONS = `
인사말("${JB_INTRO_OPENING}") 바로 다음 단락에 아래 유형의 공감 질문을 **2~3개 반드시** 넣으세요.
질문은 물음표로 끝나야 하며, 주제·키워드에 맞게 구체적으로 변형하세요. 생략·삭제 금지.

[공감 질문 예시 — 주제에 맞게 변형]
- "혹시 우리 아이가 운동을 시작하기엔 너무 소심한 건 아닐까 고민하고 계신가요?"
- "배구학원 비용과 효과, 정말 괜찮을지 망설이고 계시죠?"
- "체육 활동이 학업에 방해가 되지 않을까 걱정되시나요?"
- "아이가 팀 스포츠에 잘 어울릴 수 있을지 불안하신가요?"
- "수지·용인에서 배구학원을 알아보시다가 어디가 믿을 만한지 헷갈리시죠?"
- "초등학생 배구, 너무 일찍 시작하는 건 아닐까 망설이고 계신가요?"
- "아이의 자존감과 체력을 동시에 키울 수 있는 운동을 찾고 계신가요?"

[작성 규칙]
- 질문 2~3개는 연속된 단락 또는 줄바꿈으로 배치
- 학부모가 "맞아, 나도 그랬어"라고 느끼게 구체적 고민(체력·인성·자신감·안전·비용·또래관계) 반영
- 질문 다음에 공감 서술 1~2문장으로 이어가기
`.trim();

/** 코드 기본 지침 + 지침관리 DB 내용 통합 */
export function buildMergedPipelineGuideline(adminGuideline: string): string {
  const admin = adminGuideline.trim();
  return `
[JB스포츠 필수 브랜드 지침]
${JB_BRAND_CONTEXT}

[블로그 스타일 가이드 — 구조·말투·설득 6공식]
${JB_SPORTS_BLOG_STYLE_GUIDE}

[학부모 공감 질문 — 도입부 필수]
${JB_PARENT_EMPATHY_QUESTIONS}

[본문 출력 체크리스트]
${JB_NAVER_OUTPUT_CHECKLIST}

[지침관리 블로그 프롬프트 — 관리자가 설정한 내용 전부 반영]
${admin || "(없음)"}

※ 충돌 시 우선순위: 지침관리 블로그 프롬프트 > 학부모 공감 질문 > 스타일 가이드 > 체크리스트
`.trim();
}
