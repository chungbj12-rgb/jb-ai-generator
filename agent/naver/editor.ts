import path from "path";
import type { Frame, Page } from "playwright";
import type { AgentPayload, BlogBlock } from "@/types/agent";
import { AGENT_TIMEOUTS, getNaverWriteUrl } from "@/agent/config";
import {
  getEditorFrame,
  launchNaverBrowser,
  closeBrowser,
  resolveImagePath,
} from "@/agent/naver/browser";

export interface PostDraftResult {
  draftUrl: string;
}

/** 네이버 블로그 글쓰기 → 본문+이미지 입력 → 임시저장 */
export async function postNaverDraft(
  payload: AgentPayload,
  jobDir: string,
  blogId: string,
  headless = false,
): Promise<PostDraftResult> {
  const session = await launchNaverBrowser(headless);
  const { page } = session;

  try {
    await page.goto(getNaverWriteUrl(blogId), {
      waitUntil: "domcontentloaded",
      timeout: AGENT_TIMEOUTS.navigation,
    });

    await page.waitForTimeout(3000);
    const editorFrame = await getEditorFrame(page);

    await fillTitle(editorFrame, page, payload.title);

    for (const block of payload.blocks) {
      await insertBlock(editorFrame, page, block, jobDir);
      await page.waitForTimeout(500);
    }

    const draftUrl = await saveDraft(page, editorFrame);
    return { draftUrl };
  } finally {
    await closeBrowser(session);
  }
}

async function fillTitle(
  frame: Frame,
  page: Page,
  title: string,
): Promise<void> {
  const selectors = [
    ".se-documentTitle",
    "[placeholder*='제목']",
    "div.se-title-text",
    ".pcol1",
  ];

  for (const selector of selectors) {
    const el = frame.locator(selector).first();
    if (await el.count()) {
      await el.click();
      await page.keyboard.type(title, { delay: 20 });
      return;
    }
  }

  // 폴백: 본문 영역 위쪽 클릭 후 제목 입력
  await page.keyboard.press("Tab");
  await page.keyboard.type(title, { delay: 20 });
}

async function insertBlock(
  frame: Frame,
  page: Page,
  block: BlogBlock,
  jobDir: string,
): Promise<void> {
  if (block.type === "heading") {
    await focusBody(frame, page);
    await page.keyboard.press("Enter");
    await page.keyboard.type(block.content ?? "", { delay: 15 });
    return;
  }

  if (block.type === "paragraph") {
    await focusBody(frame, page);
    await page.keyboard.press("Enter");
    await page.keyboard.type(block.content ?? "", { delay: 12 });
    return;
  }

  if (block.type === "image" && block.imagePath) {
    await uploadImage(frame, page, resolveImagePath(jobDir, block.imagePath));
    await page.keyboard.press("Enter");
    return;
  }

  if (block.type === "cta") {
    await insertCta(frame, page, block);
  }
}

async function insertCta(
  frame: Frame,
  page: Page,
  block: BlogBlock,
): Promise<void> {
  await focusBody(frame, page);
  await page.keyboard.press("Enter");

  const text = block.ctaText ?? block.content ?? "";
  await page.keyboard.type(text, { delay: 12 });
  await page.keyboard.press("Enter");

  const buttonLabel = block.ctaButtonText ?? "바로가기";
  const link = block.ctaButtonLink ?? "";

  if (link) {
    await page.keyboard.type(`${buttonLabel}: ${link}`, { delay: 10 });
  } else {
    await page.keyboard.type(buttonLabel, { delay: 10 });
  }
}

async function focusBody(frame: Frame, page: Page): Promise<void> {
  const bodySelectors = [
    ".se-component-content",
    ".se-text-paragraph",
    "[contenteditable='true']",
    ".se-main-container",
  ];

  for (const selector of bodySelectors) {
    const el = frame.locator(selector).last();
    if (await el.count()) {
      await el.click();
      return;
    }
  }

  await page.mouse.click(700, 500);
}

async function uploadImage(
  frame: Frame,
  page: Page,
  imagePath: string,
): Promise<void> {
  const absolutePath = path.resolve(imagePath);

  const photoButtonSelectors = [
    "button[data-name='image']",
    ".se-image-toolbar-button",
    "button[aria-label*='사진']",
    "button[title*='사진']",
  ];

  let uploaded = false;

  for (const selector of photoButtonSelectors) {
    const btn = frame.locator(selector).first();
    if (!(await btn.count())) continue;

    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 5000 }).catch(() => null),
      btn.click(),
    ]);

    if (fileChooser) {
      await fileChooser.setFiles(absolutePath);
      uploaded = true;
      break;
    }
  }

  if (!uploaded) {
    const fileInput = frame.locator("input[type='file']").first();
    if (await fileInput.count()) {
      await fileInput.setInputFiles(absolutePath);
      uploaded = true;
    }
  }

  if (!uploaded) {
    throw new Error(`이미지 업로드 UI를 찾지 못했습니다: ${absolutePath}`);
  }

  await page.waitForTimeout(2000);
}

async function saveDraft(
  page: Page,
  frame: Frame,
): Promise<string> {
  const draftSelectors = [
    "button:has-text('임시저장')",
    ".btn_temp_save",
    "[data-click-area='tpb.save']",
    "button.save_btn",
  ];

  for (const selector of draftSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(2000);
      return page.url();
    }
  }

  for (const selector of draftSelectors) {
    const btn = frame.locator(selector).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(2000);
      return page.url();
    }
  }

  throw new Error("임시저장 버튼을 찾지 못했습니다. 네이버 에디터 UI가 변경되었을 수 있습니다.");
}
