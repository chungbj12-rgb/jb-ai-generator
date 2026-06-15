import type { AgentPayload, BlogBlock } from "@/types/agent";

/** 고정 글 생성 규칙 */
export const BLOG_RULES = {
  minChars: 1500,
  maxChars: 1800,
  keywordRepeatCount: 5,
  minImages: 6,
  maxImages: 8,
  maxRetries: 3,
} as const;

/** JB스포츠 예시글 스타일 — 프롬프트에 고정 삽입 */
export const FIXED_STYLE_GUIDE = `
▸ 발행자: 9년차 배구센터 대표 정봉진 (용인 수지구, 누적 회원 4000명)
▸ 대상 독자: 초등~중학생 자녀를 둔 용인 수지구 학부모

━━━ 1. 제목 공식 ━━━
- 구매직전 키워드를 제목 맨 앞에 배치
- 형식: [키워드] + [숫자/의외성/위협/궁금증]
- 추상어 절대 금지 → 구체적 숫자로 변환
- 좋은 예: "용인배구학원, 등록 전 꼭 확인할 3가지"
- 나쁜 예: "좋은 배구학원 고르는 방법"

━━━ 2. 키워드 전략 ━━━
- 구매직전 키워드 사용: 용인배구학원, 수지구배구, 초등배구레슨, 용인배구센터 등
- 키워드를 제목 맨 앞 + 본문에서 정확히 5번 자연스럽게 반복
- 글자수: 1,500~1,800자 유지

━━━ 3. 글 구조 ━━━
0) 제목 (키워드 + 뒷제목)
1) 도입부: 인사 + 9년/4000명 실적으로 신뢰 입증 → 오늘 글에서 얻을 것 예고
2) 본론: 장점/차별점 3~4가지
   → 각 소제목마다:
      ① 타 센터/일반적 문제 제기
      ② JB스포츠의 다른 점 구체적 설명
      ③ 실제 학부모 반응 or 에피소드
3) 결론: 사명감 어필 ("이 글은 자랑이 아닙니다")
4) CTA: 체험 신청 링크 → 문의 전화

━━━ 4. 설득 6가지 공식 (모두 적용) ━━━
① 첫 문장: 제목과 이어지는 강력한 첫 문장 (지정된 첫 문장으로 반드시 시작)
② 숫자: 구체적 숫자 반드시 포함 (9년, 4000명, 2코치 등)
③ 공감+반박: 학부모 걱정 공감 → 하나씩 재반박
④ 위협: 손실 언어 사용 ("잘못 고르면 아이 자신감이 오히려 떨어집니다")
⑤ 의외성: 의외 포인트 1개 이상 ("사실 코치가 많다고 좋은 게 아닙니다")
⑥ 이미지: 수업 사진, 카톡 후기, 차량 사진 등 6~8장

━━━ 5. 소제목 스타일 ━━━
- 형식: "첫 번째, [키워드]를 '꼭' 확인하세요"
- 핵심 단어 따옴표(' ') 강조
- 독자에게 직접 행동 지시형

━━━ 6. 말투 규칙 ━━━
- 공손하지만 대화하듯 자연스럽게
- ~하십니다 / ~드립니다 기본 (전문성 있는 글)
- 업체 입장의 솔직한 속내 가끔 공개 (신뢰 UP)
- 한 문단 최대 3~4줄, 중요 문장은 단독 1줄

━━━ 7. 발행 전 체크리스트 ━━━
□ 키워드 제목 맨 앞 배치
□ 본문 키워드 정확히 5번 반복
□ 글자수 1,500자 이상 (1,800자 이하 권장)
□ 이미지 6~8장
□ 대표전화 031-266-5779 삽입
□ 체험 신청 링크 CTA 포함 (마지막에 자연스럽게)
`.trim();

export interface BlogValidationInput {
  keyword: string;
  firstSentence: string;
}

/** 본문 텍스트 추출 (제목·CTA 블록 제외, heading+paragraph) */
export function extractBodyText(blocks: BlogBlock[]): string {
  return blocks
    .filter((b) => b.type === "heading" || b.type === "paragraph")
    .map((b) => b.content ?? "")
    .join("\n");
}

/** 키워드 등장 횟수 (부분 일치) */
export function countKeywordOccurrences(text: string, keyword: string): number {
  if (!keyword.trim()) return 0;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.match(new RegExp(escaped, "g"));
  return matches?.length ?? 0;
}

export function countBodyChars(blocks: BlogBlock[]): number {
  return extractBodyText(blocks).length;
}

/** 고정 규칙 검증 — 실패 시 오류 메시지 배열 반환 */
export function validateBlogPayload(
  payload: AgentPayload,
  rules: BlogValidationInput,
): string[] {
  const errors: string[] = [];
  const bodyText = extractBodyText(payload.blocks);
  const charCount = bodyText.length;
  const keywordCount = countKeywordOccurrences(bodyText, rules.keyword);

  if (charCount < BLOG_RULES.minChars) {
    errors.push(
      `본문 글자 수 ${charCount}자 — ${BLOG_RULES.minChars}자 이상 필요`,
    );
  }
  if (charCount > BLOG_RULES.maxChars) {
    errors.push(
      `본문 글자 수 ${charCount}자 — ${BLOG_RULES.maxChars}자 이하 권장`,
    );
  }
  if (keywordCount !== BLOG_RULES.keywordRepeatCount) {
    errors.push(
      `키워드 "${rules.keyword}" ${keywordCount}회 — 정확히 ${BLOG_RULES.keywordRepeatCount}회 필요`,
    );
  }

  const trimmedBody = bodyText.trim();
  const trimmedFirst = rules.firstSentence.trim();
  if (!trimmedBody.startsWith(trimmedFirst)) {
    errors.push(
      `첫 문장이 "${trimmedFirst.slice(0, 40)}..."로 시작해야 합니다`,
    );
  }

  if (!payload.title.includes(rules.keyword)) {
    errors.push(`제목 맨 앞에 키워드 "${rules.keyword}" 포함 필요`);
  }

  const images = payload.blocks.filter((b) => b.type === "image").length;
  if (images < BLOG_RULES.minImages || images > BLOG_RULES.maxImages) {
    errors.push(
      `이미지 ${images}장 — ${BLOG_RULES.minImages}~${BLOG_RULES.maxImages}장 필요`,
    );
  }

  if (!bodyText.includes("031-266-5779")) {
    errors.push("본문에 대표전화 031-266-5779 포함 필요");
  }

  return errors;
}

export function buildFixedRulesSection(
  topic: string,
  keyword: string,
  firstSentence: string,
  imageCount: number,
): string {
  return `
[고정 생성 규칙 — 반드시 준수, 미충족 시 실패]
1. 본문(heading+paragraph) ${BLOG_RULES.minChars}자 이상, ${BLOG_RULES.maxChars}자 이하
2. 주제 키워드 "${keyword}"를 본문에 정확히 ${BLOG_RULES.keywordRepeatCount}번 반복 (제목 제외)
3. 첫 번째 paragraph는 반드시 아래 문장으로 시작:
   "${firstSentence}"
4. 전문성 있는 글 — 예시글 스타일(아래 가이드) 유지
5. CTA는 본문 마지막에 자연스럽게 배치 (별도 cta 블록은 시스템이 추가)
6. image 블록 정확히 ${imageCount}개 — 문단 사이 배치
7. 제목 맨 앞에 키워드 "${keyword}" 배치
8. 본문에 대표전화 031-266-5779 포함

[주제]
${topic}

[주제 키워드 — 본문 5회 반복]
${keyword}

[첫 문장 — 본문 첫 paragraph가 이 문장으로 시작]
${firstSentence}

[예시글 스타일 가이드]
${FIXED_STYLE_GUIDE}
`.trim();
}
