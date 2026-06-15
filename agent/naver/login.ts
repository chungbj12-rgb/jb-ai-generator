import { AGENT_TIMEOUTS, NAVER_LOGIN_URL } from "@/agent/config";
import { launchNaverBrowser, closeBrowser } from "@/agent/naver/browser";
import type { AgentRunConfig } from "@/types/agent";

/** 네이버 ID/비밀번호로 자동 로그인 */
export async function loginWithCredentials(
  naverId: string,
  naverPassword: string,
  headless = false,
): Promise<void> {
  const session = await launchNaverBrowser(headless);
  const { page } = session;

  try {
    await page.goto(NAVER_LOGIN_URL, {
      waitUntil: "domcontentloaded",
      timeout: AGENT_TIMEOUTS.navigation,
    });

    const idInput = page.locator("#id");
    const pwInput = page.locator("#pw");

    await idInput.click();
    await idInput.fill("");
    await idInput.pressSequentially(naverId, { delay: 80 });

    await pwInput.click();
    await pwInput.fill("");
    await pwInput.pressSequentially(naverPassword, { delay: 80 });

    await page.locator("#log\\.login").click();
    await page.waitForTimeout(3000);

    const cookies = await session.context.cookies();
    const loggedIn = cookies.some(
      (c) => c.domain.includes("naver.com") && (c.name === "NID_AUT" || c.name === "NID_SES"),
    );

    if (!loggedIn) {
      throw new Error(
        "네이버 자동 로그인에 실패했습니다. 캡차·2단계 인증이 있으면 브라우저에서 직접 완료 후 다시 시도하세요.",
      );
    }

    console.log("네이버 로그인 성공 (세션 저장됨)");
  } finally {
    await closeBrowser(session);
  }
}

/** 설정 기반 로그인 — 세션 없으면 ID/PW로 로그인 */
export async function ensureNaverLogin(
  config: Pick<AgentRunConfig, "naverId" | "naverPassword">,
  headless = false,
): Promise<void> {
  const hasSession = await verifyNaverSession();
  if (hasSession) {
    console.log("저장된 네이버 세션 사용");
    return;
  }

  if (!config.naverId || !config.naverPassword) {
    throw new Error("네이버 아이디·비밀번호가 필요합니다.");
  }

  console.log("네이버 자동 로그인 시도...");
  await loginWithCredentials(config.naverId, config.naverPassword, headless);
}

/** 수동 로그인 (기존 방식 유지) */
export async function runNaverLogin(): Promise<void> {
  console.log("브라우저에서 네이버 로그인 후 Enter를 누르세요.");
  const session = await launchNaverBrowser(false);
  const { page } = session;

  try {
    await page.goto(NAVER_LOGIN_URL, {
      waitUntil: "domcontentloaded",
      timeout: AGENT_TIMEOUTS.navigation,
    });
    await waitForEnter();
    console.log("네이버 로그인 세션이 저장되었습니다.");
  } finally {
    await closeBrowser(session);
  }
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdout.write("\n로그인 완료 후 Enter... ");
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
}

export async function verifyNaverSession(): Promise<boolean> {
  const session = await launchNaverBrowser(true);
  const { page } = session;

  try {
    await page.goto("https://blog.naver.com", {
      waitUntil: "domcontentloaded",
      timeout: AGENT_TIMEOUTS.navigation,
    });

    const cookies = await session.context.cookies();
    return cookies.some(
      (c) => c.domain.includes("naver.com") && (c.name === "NID_AUT" || c.name === "NID_SES"),
    );
  } catch {
    return false;
  } finally {
    await closeBrowser(session);
  }
}
