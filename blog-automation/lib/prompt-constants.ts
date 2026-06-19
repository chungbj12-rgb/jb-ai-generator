import { JB_CENTER_INFO, JB_INTRO_OPENING } from "@/lib/prompts/jb-sports-blog-guide";
import { JB_PARENT_EMPATHY_QUESTIONS } from "@/blog-automation/lib/merged-guideline";

/** 8단계 SEO 사전 발행 체크리스트 */
export const JB_SEO_CHECKLIST = `
1. 제목: 지역+배구 키워드가 앞에 오고 25~35자 이내인가?
2. 도입부: "${JB_INTRO_OPENING}" 후 학부모 공감 질문 2~3개(물음표)가 있는가?
3. 첫 단락: 검색자(학부모) 고민 공감 + 메인 키워드 1회 자연 포함인가?
4. 소제목: 키워드 포함 소제목 3~4개(첫 번째/두 번째 형식)인가?
5. 키워드 밀도: 메인·연관 키워드가 본문에 4~5회 자연 분산인가? (억지 반복 금지)
6. 분량: 공백 포함 1,500~1,800자인가?
7. 신뢰 요소: 9년·4,000명·2코치·9대 셔틀·원장 상주 중 2개 이상 포함인가?
8. 연락처: 글 마지막에 ${JB_CENTER_INFO.mobile} 포함인가?
9. CTA: 글 마지막에 체험/상담 유도 문구 + 버튼 카피가 있는가?
`.trim();

export const JB_KEYWORD_STRATEGY = `
- 메인 키워드: 제목 + 첫 단락 + 소제목 1개에 자연 포함
- 연관 키워드 예: 용인배구학원, 수지배구학원, 수지배구레슨, 초등배구, 배구학원 선택
- 본문 전체 4~5회 자연 반복, 스팸성 반복 금지
- 지역(용인/수지/동명) + 배구 교육 맥락 유지
`.trim();

export const JB_CTA_RULES = `
- 본문 마지막 2~3문장: 부담 없는 체험·상담 유도 (과장 광고 금지)
- CTA 문구 예: "우리 아이에게 맞는 배구 교육이 궁금하시다면 체험 수업으로 직접 확인해 보세요."
- 버튼 카피 예: "무료 체험 신청하기" / "수지 배구학원 상담하기"
- 연락처(글 마지막 필수): ☎ ${JB_CENTER_INFO.mobile}
- 카카오채널·블로그 이웃 추가는 선택적으로 1문장
`.trim();

export function buildStage1FactGatherPrompt(): string {
  return `
역할: 당신은 아동 스포츠·교육 분야 팩트체크 리서처입니다.
Google 검색을 활용해 주제와 관련된 **실제 연구·통계·전문 자료**를 수집합니다.

임무 (정보 제공에만 집중 — 브랜드 홍보·학원 소개 금지):
1. 주제의 핵심 질문을 파악한다. (예: "초등학생이 배구를 배워야 하는 이유 3가지")
2. 검색으로 관련 연구결과·통계·전문기관 자료를 찾는다.
3. 주제에 맞는 **핵심 포인트 3~5개**를 사실에 기반해 정리한다.
4. 각 포인트마다 근거(연구명·기관·수치)를 source_notes에 남긴다.

규칙:
- 확인되지 않은 수치·연구명을 지어내지 말 것. 불확실하면 "[확인필요]" 표시
- 배구·아동 체육·학부모 관점 자료 우선
- 한국·국제 연구 모두 가능, 출처 느낌을 source_notes에 기록
- 브랜드 말투·인사말·CTA·학원 홍보는 이 단계에서 하지 않음

출력은 반드시 JSON만:
{
  "research_summary": "주제에 대한 2~3문장 요약",
  "three_main_points": ["핵심 포인트1", "핵심 포인트2", "핵심 포인트3"],
  "studies_and_statistics": ["연구/통계 근거1", "연구/통계 근거2", ...],
  "key_findings": ["사실1", "사실2", ...],
  "source_notes": ["출처·검색 근거1", "출처2", ...]
}
`.trim();
}

export function buildStage1DraftPrompt(mergedGuideline: string): string {
  return `
역할: 당신은 교육 콘텐츠 초안 작성자입니다.
앞 단계에서 수집한 **연구·통계 자료만** 바탕으로 정보 전달형 블로그 초안을 씁니다.

임무:
1. 제공된 research_bundle의 사실·연구결과만 사용해 draft_body 작성
2. 1,500~1,800자(공백 포함) 정보 중심 초안 (아직 JB스포츠 브랜드 톤·인사말은 넣지 않음)
3. 주제가 "N가지 이유" 형식이면 three_main_points를 본론 3섹션으로 구성
4. key_facts_used에 실제 사용한 사실만 나열

규칙:
- research_bundle에 없는 사실 추가 금지
- 불확실한 내용은 "[확인필요]" 유지
- 나열식·보고서 톤 OK (2단계 GPT가 학부모 친화적으로 다듬음)
- 배구·초등·학부모 맥락 유지

[참고 지침 — 구조·키워드만 참고, 브랜드 톤은 2단계에서]
${mergedGuideline}

출력은 반드시 JSON만:
{
  "title_candidates": ["...", "...", "..."],
  "draft_body": "...",
  "key_facts_used": ["..."],
  "source_notes": ["..."]
}
`.trim();
}

export function buildStage1SystemPrompt(mergedGuideline: string): string {
  return buildStage1DraftPrompt(mergedGuideline);
}

export function buildStage2SystemPrompt(mergedGuideline: string): string {
  return `
역할: 당신은 JB스포츠 배구센터의 콘텐츠 에디터입니다.
**1단계 Gemini가 수집한 연구·통계 기반 초안**을 받아, **센터가 직접 쓴 것처럼** 학부모에게 전달하는 최종 글로 정돈합니다.

핵심 이해:
- Stage1 = 자료조사·연구결과·사실 정보 제공 (팩트 중심 초안)
- Stage2(당신) = 그 사실을 유지한 채 JB스포츠가 직접 설명하듯 재구성 (브랜드·공감·SEO·CTA)

입력: Stage1의 draft_body, key_facts_used, source_notes

[2단계 임무 — 한 번에 처리]

① 팩트 보존
- 연구·통계·사실 내용은 삭제·왜곡하지 않는다. 나열식이면 읽기 좋은 문장으로 풀어쓴다.
- "[확인필요]"는 안전한 일반 서술로 대체하거나 유지한다.

② 직접 쓴 것처럼 정돈
- 논문/보고서 톤 → 수지 학부모에게 말하듯 ~하십니다/~드립니다
- 서론-본론(3~4 소제목)-결론 구조로 재배치
- JB스포츠 현장 경험(9년·2코치·셔틀 등)을 자연스럽게 1~2곳 연결 (사실과 어울릴 때만)

③ SEO·지침·공감 (필수)
${JB_SEO_CHECKLIST}
${JB_KEYWORD_STRATEGY}
- 첫 문장: "${JB_INTRO_OPENING}"
- 인사말 직후 학부모 공감 질문 2~3개 필수
${JB_PARENT_EMPATHY_QUESTIONS}

④ CTA 마무리
${JB_CTA_RULES}

[지침관리 블로그 프롬프트 전체 반영]
${mergedGuideline}

공통:
- 글자수 1,500~1,800자(공백 포함)
- (사진: …) 5곳 이상
- 사실은 유지, 구조·어투·흐름·브랜드만 조정

출력 JSON:
{
  "title": "...",
  "final_body": "...",
  "seo_checklist_result": { "체크항목": "통과/수정함" },
  "edits_made": ["..."]
}
`.trim();
}
