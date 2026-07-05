import { JB_CENTER_INFO, JB_INTRO_OPENING } from "@/lib/prompts/jb-sports-blog-guide";
import type { NoticeType, Tone } from "@/types";

const NOTICE_TYPE_LABELS: Record<NoticeType, string> = {
  new_class: "신규 클래스 소개",
  announcement: "공지사항",
  event: "이벤트·대회 안내",
  general: "일반 안내",
};

const TONE_HINT: Record<Tone, string> = {
  friendly: "친근하고 따뜻한 반존대 (~해요, ~거든요)",
  professional: "신뢰감 있는 전문적 반존대",
  emotional: "학부모 공감을 담은 따뜻한 반존대",
};

export function getNoticeTypeLabel(type: NoticeType): string {
  return NOTICE_TYPE_LABELS[type] ?? "안내";
}

export function buildNoticeSystemPrompt(noticeType: NoticeType, tone: Tone): string {
  return `당신은 ${JB_CENTER_INFO.name}의 공지·안내 콘텐츠 작가입니다.
센터 정보: ${JB_CENTER_INFO.location}, ${JB_CENTER_INFO.years} 운영, 문의 ${JB_CENTER_INFO.phone} / ${JB_CENTER_INFO.mobile}

[작성 유형]
${getNoticeTypeLabel(noticeType)}

[말투]
${TONE_HINT[tone]}
- 완전한 반말 금지, 딱딱한 공문체 금지
- 학부모가 읽기 쉬운 안내 톤

[필수 구조]
1. 도입: "${JB_INTRO_OPENING}" 로 시작 (첫 줄)
2. 핵심 안내 (일정·대상·장소·비용·신청 방법 등 사용자 제공 정보를 빠짐없이 반영)
3. 센터 강점 1~2문장 (과장 없이)
4. 마무리 CTA: 체험·상담 문의 (${JB_CENTER_INFO.phone} 또는 ${JB_CENTER_INFO.mobile})

[이미지 처리]
- 첨부 이미지가 있으면 내용을 분석해 본문 흐름에 맞게 [이미지1: 간단 설명], [이미지2: ...] 형태로 삽입 위치 표시
- 이미지에 없는 내용을 지어내지 마세요

[분량]
- 600~1200자 (공백·줄바꿈 포함)
- 2~4문장마다 줄바꿈
- 소제목(## 또는 ■)로 구역 구분

[금지]
- 사용자가 제공하지 않은 일정·가격·혜택을 임의로 추가하지 마세요
- 특정 학생 실명·식별 정보 금지
- JSON·메타 설명 없이 본문만 출력`;
}

export function buildNoticeUserPrompt(
  title: string,
  sourceInfo: string,
  hasImages: boolean,
): string {
  return `[글 제목/주제]
${title}

[사용자가 제공한 안내 정보 — 반드시 사실 그대로 반영]
${sourceInfo}

${hasImages ? "[첨부 이미지]\n위 이미지들을 분석해 포스터·현장 사진 등에서 확인되는 정보도 글에 반영하고, 적절한 위치에 [이미지N: 설명] 마커를 넣으세요.\n" : ""}
위 정보를 바탕으로 네이버 블로그용 공지·안내 글 본문만 작성하세요.`;
}
