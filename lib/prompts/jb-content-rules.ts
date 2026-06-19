/** JB스포츠 배구센터 — 제목 추천·본문 생성 공통 지침 */

import { JB_CENTER_INFO, JB_INTRO_OPENING } from "@/lib/prompts/jb-sports-blog-guide";

export const JB_BRAND_CONTEXT = `
[브랜드·주제 범위 — 반드시 준수]
- 업체: 제이비스포츠 배구센터 (JB스포츠), 용인시 수지구, 대표 정봉진
- 대상: 초·중·고 학생 및 학부모 (배구 입문·배구학원 선택·배구로 성장)
- 주제 범위: 배구 교육, 배구학원/레슨 선택, 아이 체력·인성·자신감, 팀워크, 수지·용인 지역 스포츠
- 절대 금지 주제: 여행, 맛집, 다이어트, 부동산, 일반 라이프스타일, 배구와 무관한 취미
- 입력 키워드가 모호해도 반드시 "배구·배구학원·아이 운동" 맥락으로 해석
`.trim();

export const JB_TITLE_HOOK_WORDS = [
  "이것모르면",
  "대부분이 놓치는",
  "아무도 알려주지 않는",
  "착각",
  "비밀",
  "이유",
  "방법",
  "팁",
  "진실",
  "노하우",
  "주의사항",
  "꼭 알아야 할",
  "명심하세요",
  "확인하세요",
] as const;

export const JB_REGION_KEYWORDS = [
  "용인배구학원",
  "수지배구학원",
  "용인배구레슨",
  "수지배구레슨",
  "수지스포츠센터",
  "용인스포츠센터",
] as const;

/** 네이버 제목 추천용 프롬프트 */
export function buildNaverTitleSuggestPrompt(keyword: string): string {
  return `당신은 용인 수지 JB스포츠 배구센터 전담 네이버 블로그 마케터입니다.

${JB_BRAND_CONTEXT}

[입력 키워드]
"${keyword}"

위 키워드로 네이버 블로그 **배구·배구학원·아이 운동** 관련 **글 제목 10개**만 추천하세요.

[제목 작성 규칙]
- 25~35자, 지역 키워드(용인/수지/○○동)를 제목 앞에 배치
- 핵심 키워드 "${keyword}" 또는 배구 관련어(배구학원, 배구레슨, 배구교육) 포함 필수
- 후킹 단어 1개 이상: ${JB_TITLE_HOOK_WORDS.slice(0, 8).join(", ")} 등
- 숫자·구체 정보 포함 (예: 3가지, 5가지, TOP 3)
- 학부모 검색 의도: 선택 기준, 성장, 체험, 비용, 안전, 팀워크, 자신감
- 배구와 무관한 제목(여행, 맛집, 다이어트, 재테크 등) 절대 금지

[좋은 예]
- "용인배구학원, 초등 자녀 성장에 아무도 알려주지 않는 3가지 비밀"
- "수지배구레슨 선택, 대부분이 놓치는 5가지 확인 포인트"

[출력]
JSON 배열 10개만. 마크다운·설명 없음.
예: ["제목1", "제목2", ...]`;
}

/** 쓰레드 주제 추천용 */
export function buildThreadTopicSuggestPrompt(keyword: string): string {
  return `당신은 JB스포츠 배구센터 콘텐츠 담당자입니다.

${JB_BRAND_CONTEXT}

[입력 키워드] "${keyword}"

배구·아이 운동·학부모 고민 맥락의 쓰레드 주제 5개를 JSON 배열로만 출력하세요.
배구와 무관한 주제 금지.`;
}

/** 제목이 배구 관련인지 간단 검증 */
const VOLLEYBALL_SIGNALS = [
  "배구",
  "학원",
  "레슨",
  "스포츠",
  "운동",
  "체육",
  "훈련",
  "수업",
  "초등",
  "중학",
  "고등",
  "학부모",
  "아이",
  "자녀",
  "수지",
  "용인",
  "풍덕",
  "상현",
  "성복",
  "동천",
  "광교",
  "팀워크",
  "성장",
  "체험",
  "코치",
  "JB",
  "제이비",
];

export function isVolleyballRelatedText(text: string, keyword = ""): boolean {
  const combined = `${text} ${keyword}`.toLowerCase();
  return VOLLEYBALL_SIGNALS.some((term) => combined.includes(term.toLowerCase()));
}

/** 키워드 기반 JB스포츠 맞춤 폴백 제목 */
export function buildJbNaverFallbackTitles(keyword: string): string[] {
  const k = keyword.trim() || "수지배구학원";
  const region = k.includes("용인") ? "용인" : "수지";
  return [
    `${region}배구학원, 초등 자녀 성장에 아무도 알려주지 않는 3가지 비밀`,
    `${k} 선택, 대부분이 놓치는 5가지 확인 포인트`,
    `수지 학부모가 꼭 알아야 할 ${k} 체험·등록 가이드`,
    `${k}, 잘못 고르면 아이 자신감이 떨어지는 이유`,
    `초등 배구 시작 전 ${k}에서 확인할 4가지`,
    `${region} 아이 체력·인성 키우는 배구교육, ${k} 솔직 후기`,
    `${k} 비용·수업 방식·코치진 비교 TOP 3`,
    `중학생 배구 입문, ${k}에서 시작해야 하는 이유`,
    `${k} 수업당 코치 2명 시스템, 학부모가 놓치는 진실`,
    `${region} 배구학원 ${k} 상담 전 명심하세요`,
  ];
}

export function buildJbThreadFallbackTopics(keyword: string): string[] {
  const k = keyword.trim() || "배구학원";
  return [
    `학부모가 ${k} 고를 때 가장 많이 하는 착각 3가지`,
    `초등생 배구 시작, ${k} 체험 전에 알면 좋은 것`,
    `수지 엄마들이 ${k}를 찾는 진짜 이유`,
    `아이 자신감 키우는 배구교육 — ${k} 현장 이야기`,
    `${k} 등록 전 코치·안전·수업 인원 꼭 확인하세요`,
  ];
}

/** 웹 본문 생성 시 필수 출력 체크리스트 */
export const JB_NAVER_OUTPUT_CHECKLIST = `
[본문 출력 체크리스트 — 하나라도 빠지면 실패]
1. 첫 문장: "${JB_INTRO_OPENING}" 로 시작 (대표 인사·정봉진 소개 문구 금지)
2. 9년차·누적 4,000명·코치 2명·차량 9대 중 2개 이상 언급
3. 인사말 직후 학부모 공감 질문 2~3개 (물음표 문장, 고민·걱정 유형) — 생략 금지
4. 학부모 고민 공감 서술 2~3문장 (체력, 인성, 자신감, 안전 등)
5. 소제목 3~4개 ("첫 번째, …" / "두 번째, …" 형식)
6. 배구 교육·JB스포츠 방식·기대효과가 각 섹션에 포함
7. 지역 키워드(용인/수지/배구학원 등) 4~5회 자연 반복
8. 마지막 연락처: ${JB_CENTER_INFO.mobile} 포함
9. 마무리: "긴 글 읽어주셔서 감사합니다."
10. (사진: …) 이미지 삽입 위치 5곳 이상
11. JSON·blocks 형식 금지 — 읽을 수 있는 블로그 본문 plain text만 출력
`.trim();
