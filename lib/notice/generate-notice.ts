import {
  buildNoticeSystemPrompt,
  buildNoticeUserPrompt,
} from "@/lib/prompts/notice-prompts";
import {
  generateMultimodalText,
  generateTextWithSystem,
  isGeminiConfigured,
} from "@/lib/gemini";
import type { NoticeImageInput, NoticeType, Tone } from "@/types";

export interface GenerateNoticeOptions {
  noticeType: NoticeType;
  title: string;
  sourceInfo: string;
  images?: NoticeImageInput[];
  tone?: Tone;
}

export interface GenerateNoticeResult {
  title: string;
  body: string;
  char_count: number;
  used_images: number;
}

export async function generateNoticeContent(
  options: GenerateNoticeOptions,
): Promise<GenerateNoticeResult> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const title = options.title.trim();
  const sourceInfo = options.sourceInfo.trim();
  const tone = options.tone ?? "friendly";
  const images = (options.images ?? []).slice(0, 5);

  if (!title) throw new Error("제목을 입력해 주세요.");
  if (!sourceInfo) throw new Error("안내 정보를 입력해 주세요.");

  const systemPrompt = buildNoticeSystemPrompt(options.noticeType, tone);
  const userPrompt = buildNoticeUserPrompt(title, sourceInfo, images.length > 0);

  const body =
    images.length > 0
      ? await generateMultimodalText(systemPrompt, userPrompt, images, {
          maxOutputTokens: 8192,
        })
      : await generateTextWithSystem(systemPrompt, userPrompt, {
          maxOutputTokens: 8192,
        });

  return {
    title,
    body,
    char_count: body.length,
    used_images: images.length,
  };
}
