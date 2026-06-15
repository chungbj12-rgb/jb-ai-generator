import path from "path";
import { chromium, type BrowserContext, type Page } from "playwright";
import {
  AGENT_TIMEOUTS,
  NAVER_SESSION_DIR,
} from "@/agent/config";

export interface BrowserSession {
  context: BrowserContext;
  page: Page;
}

/** 저장된 네이버 세션으로 브라우저 실행 */
export async function launchNaverBrowser(
  headless = false,
): Promise<BrowserSession> {
  const context = await chromium.launchPersistentContext(NAVER_SESSION_DIR, {
    headless,
    viewport: { width: 1400, height: 900 },
    locale: "ko-KR",
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(AGENT_TIMEOUTS.editor);

  return { context, page };
}

export async function closeBrowser(session: BrowserSession): Promise<void> {
  await session.context.close();
}

/** 스마트에디터 iframe 내부 frame 탐색 */
export async function getEditorFrame(page: Page) {
  const mainFrame = page.frame({ name: "mainFrame" });
  if (mainFrame) {
    const nested = mainFrame.childFrames().find((f) =>
      f.url().includes("editor") || f.name().includes("editor"),
    );
    if (nested) return nested;
    return mainFrame;
  }

  for (const frame of page.frames()) {
    if (frame.url().includes("PostWrite") || frame.url().includes("editor")) {
      return frame;
    }
  }

  return page.mainFrame();
}

export function resolveImagePath(jobDir: string, imagePath: string): string {
  if (path.isAbsolute(imagePath)) return imagePath;
  return path.join(jobDir, imagePath);
}
