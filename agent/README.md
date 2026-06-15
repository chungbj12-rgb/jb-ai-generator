# 네이버 블로그 자동화 에이전트

## 입력값

| 필드 | 설명 |
|------|------|
| `naverId` | 네이버 아이디 |
| `naverPassword` | 네이버 비밀번호 |
| `blogId` | 블로그 ID (`blog.naver.com/{blogId}`) |
| `topic` | 글 주제 |
| `ctaText` | CTA 문구 |
| `ctaButtonText` | CTA 버튼 문구 |
| `ctaButtonLink` | CTA 버튼 링크 (URL) |
| `textModel` | 글 생성 모델 (`gemini-2.5-flash`, `gpt-4o` 등) |
| `imageModel` | 이미지 모델 (`imagen-4.0-generate-001`, `dall-e-3` 등) |
| `apiKey` | 통합 API 키 (선택) |

## 설정 방법 (3가지 — 우선순위: CLI 오버라이드 > config 파일 > .env)

### 1) `agent.config.local.json` (권장)

```bash
cp agent.config.example.json agent.config.local.json
# 값 입력 후
npm run agent -- --config agent.config.local.json
```

### 2) `.env.local`

`.env.example` 참고 — `NAVER_ID`, `NAVER_PASSWORD`, `GEMINI_API_KEY` 등

### 3) 웹 UI `/automate`

jbai 로그인 후 폼 입력 → job 준비 → CLI로 포스팅

## 실행

```bash
npm install

# 설정 파일 준비
cp agent.config.example.json agent.config.local.json

# 전체 실행 (기획 → 이미지 → 네이버 임시저장)
npm run agent -- --config agent.config.local.json

# 웹에서 준비한 job 실행
npm run agent -- --job-id <uuid> --config agent.config.local.json

# 기획만
npm run agent -- --config agent.config.local.json --prepare-only

# 수동 네이버 로그인 (캡차 시)
npm run agent:login
```

## 모델 예시

| 용도 | Gemini | OpenAI |
|------|--------|--------|
| 글 | `gemini-2.5-flash` | `gpt-4o` |
| 이미지 | `imagen-4.0-generate-001` | `dall-e-3` |

모델명만 바꾸면 API 키 제공자가 자동 선택됩니다.

## 앱 로그인

Supabase Google/이메일 로그인은 **기존 `/login` 그대로** 유지됩니다.  
네이버 로그인은 에이전트 CLI에서 `naverId`/`naverPassword`로 자동 처리합니다.
