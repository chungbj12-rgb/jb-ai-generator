-- Supabase SQL Editor에서 실행하거나 supabase db push로 적용
-- 플랫폼별 프롬프트 지침 저장 테이블

CREATE TABLE IF NOT EXISTS prompt_guidelines (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  platform    TEXT        NOT NULL UNIQUE,
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by  TEXT
);

ALTER TABLE prompt_guidelines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prompt_guidelines' AND policyname = '로그인 유저 조회 가능'
  ) THEN
    CREATE POLICY "로그인 유저 조회 가능" ON prompt_guidelines
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prompt_guidelines' AND policyname = '로그인 유저 수정 가능'
  ) THEN
    CREATE POLICY "로그인 유저 수정 가능" ON prompt_guidelines
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;

INSERT INTO prompt_guidelines (platform, title, content) VALUES
(
  'naver',
  '네이버 블로그 SEO 최적화 지침',
  '## 네이버 블로그 상위노출 SEO 지침

### 제목 작성 원칙
- 핵심 키워드를 제목 앞부분에 배치
- 숫자 포함 제목 우선 (예: "7가지", "3단계", "TOP 5")
- 검색 의도를 반영한 제목 (정보형: "~하는 방법", "~란?", "~추천")
- 제목 길이: 25~35자 사이가 최적

### 본문 구성 전략
- 도입부: 검색자의 고민/문제를 공감하는 문장으로 시작 (3~5줄)
- 소제목(H2/H3): 키워드 포함 소제목 3~5개로 구성
- 단락: 한 단락 5줄 이내, 짧고 명확하게
- 분량: 최소 1,000자 ~ 2,000자 권장 (체류시간 증가)
- 결론: 핵심 요약 + 독자 행동 유도(댓글, 공감, 이웃추가)

### 키워드 전략
- 메인 키워드: 제목 + 첫 단락 + 소제목 1개에 자연스럽게 포함
- 연관 키워드: 본문 전체에 3~5회 자연스럽게 분산 배치
- 키워드 억지 반복 금지 (스팸 필터 위험)

### 네이버 알고리즘 최적화
- 이미지 대체 텍스트(alt) 포함 안내 문구 삽입
- 본문 내 내부 링크 유도 문구 포함
- 태그 추천 문구: 글 말미에 "추천 태그: #키워드1 #키워드2 #키워드3" 형식으로 5~7개 제안
- 공감/댓글 유도 CTA를 글 마지막에 반드시 포함

### 최신 트렌드 반영 (2025년)
- 경험 중심 콘텐츠: "내가 직접 해봤어요" 형식의 1인칭 후기 선호
- 정보 밀도 높은 글이 체류시간 증가로 상위노출에 유리
- 시즌/트렌드 키워드를 본문에 자연스럽게 녹여내기
- 모바일 가독성 최우선: 긴 문장 피하고 줄바꿈 적극 활용'
),
(
  'thread',
  '쓰레드 바이럴 콘텐츠 지침',
  '## 쓰레드(Threads) 조회수 폭발 바이럴 지침

### 첫 줄(훅) 작성 원칙 — 가장 중요
- 스크롤을 멈추게 하는 충격적/공감/의외성 있는 첫 문장 필수
- 패턴 예시:
  · "솔직히 말하면 ~ (반전 내용)"
  · "아무도 알려주지 않는 ~ 비밀"
  · "~ 해봤는데 결과가 충격적이었음"
  · "~ 하는 사람 vs ~ 하는 사람"
  · "~ 때문에 망했다가 ~ 로 살아난 이야기"
- 첫 줄만 보고 "더 보기"를 누르게 만들어야 함

### 본문 구성 전략
- 총 길이: 150~280자 (너무 길면 이탈, 너무 짧으면 가치 없음)
- 문단 구성: 1~2문장 후 무조건 줄바꿈 (답답함 제거)
- 리스트 형식: 번호(1. 2. 3.) 또는 이모지 불릿으로 핵심 정리
- 중간 긴장감 유지: 정보를 한 번에 주지 말고 단계적으로 공개
- 마지막 줄: 저장/공유/댓글 유도 CTA 필수

### 참여율(Engagement) 극대화 전략
- 질문형 마무리: "여러분은 어떻게 생각하세요?"
- 양자택일 유도: "A파 vs B파, 댓글로 알려주세요"
- 공감 유도: "이거 나만 그런 거 아니죠?"
- 저장 유도: "나중에 써먹을 사람 저장각"

### 이모지 활용 전략
- 섹션 구분용 이모지: 🔥 ✅ ⚡ 💡 🎯 적극 활용
- 과도한 이모지 남발 금지 (신뢰도 하락)
- 첫 줄과 CTA에 임팩트 있는 이모지 1~2개 배치

### 해시태그 전략
- 2~3개만 사용 (너무 많으면 스팸처럼 보임)
- 메인 키워드 + 트렌드 키워드 조합
- 해시태그는 글 맨 마지막에 배치

### 최신 트렌드 반영 (2025년)
- 짧은 팩트 나열형 콘텐츠 바이럴 강세
- 개인 경험담 + 실용 정보 조합이 공유율 최고
- "몰랐던 정보" 포맷이 저장률 압도적으로 높음
- 논쟁을 유발하는 의견형 콘텐츠도 댓글 폭발 효과'
)
ON CONFLICT (platform) DO NOTHING;
