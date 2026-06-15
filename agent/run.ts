#!/usr/bin/env node
/**
 * 네이버 블로그 자동화 에이전트 CLI
 *
 * npm run agent -- --config agent.config.local.json
 * npm run agent -- --job-id <uuid> --config agent.config.local.json
 */
import path from "path";
import fs from "fs/promises";
import { prepareAgentJob, loadManifest } from "@/lib/agent/orchestrator";
import { generateBlockImages } from "@/lib/agent/image-generator";
import {
  resolveAgentConfig,
  CONFIG_LOCAL_PATH,
} from "@/lib/agent/config-loader";
import { ensureNaverLogin, runNaverLogin } from "@/agent/naver/login";
import { postNaverDraft } from "@/agent/naver/editor";
import { AGENT_OUTPUT_ROOT } from "@/agent/config";
import type { AgentPayload, AgentRunConfig } from "@/types/agent";
import type { Tone } from "@/types";

interface CliArgs {
  configPath?: string;
  jobId?: string;
  login: boolean;
  headless: boolean;
  prepareOnly: boolean;
  overrides: Partial<AgentRunConfig>;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    login: false,
    headless: false,
    prepareOnly: false,
    overrides: {},
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];

    if (key === "--config" && next) {
      args.configPath = next;
      i += 1;
    } else if (key === "--job-id" && next) {
      args.jobId = next;
      i += 1;
    } else if (key === "--login") {
      args.login = true;
    } else if (key === "--headless") {
      args.headless = true;
    } else if (key === "--prepare-only") {
      args.prepareOnly = true;
    } else if (key === "--topic" && next) {
      args.overrides.topic = next;
      i += 1;
    } else if (key === "--blog-id" && next) {
      args.overrides.blogId = next;
      i += 1;
    }
  }

  return args;
}

async function fetchGuidelineFromApi(): Promise<string> {
  const baseUrl = process.env.JBAI_API_URL?.trim();
  if (!baseUrl) return "";

  try {
    const res = await fetch(`${baseUrl}/api/guidelines?platform=naver`);
    if (!res.ok) return "";
    const data = (await res.json()) as { guidelines?: Array<{ content?: string }> };
    return data.guidelines?.[0]?.content ?? "";
  } catch {
    return "";
  }
}

async function fetchJobPayload(jobId: string): Promise<AgentPayload | null> {
  const baseUrl = process.env.JBAI_API_URL?.trim();
  const token = process.env.AGENT_API_TOKEN?.trim();
  if (!baseUrl || !token) return null;

  try {
    const res = await fetch(`${baseUrl}/api/agent/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { job?: { payload?: AgentPayload } };
    return data.job?.payload ?? null;
  } catch {
    return null;
  }
}

async function ensureImages(
  payload: AgentPayload,
  jobDir: string,
  config: AgentRunConfig,
): Promise<AgentPayload> {
  const hasImages = payload.blocks.some(
    (b) => b.type === "image" && b.imagePath,
  );
  if (hasImages) return payload;

  console.log(`이미지 생성 중... (모델: ${config.imageModel})`);
  return generateBlockImages(
    payload,
    path.join(jobDir, "images"),
    {
      textModel: config.textModel,
      imageModel: config.imageModel,
      apiKey: config.apiKey,
      geminiApiKey: config.geminiApiKey,
      openaiApiKey: config.openaiApiKey,
    },
  );
}

async function updateJobStatus(
  jobId: string,
  status: string,
  extra?: { naver_draft_url?: string; error_message?: string },
): Promise<void> {
  const baseUrl = process.env.JBAI_API_URL?.trim();
  const token = process.env.AGENT_API_TOKEN?.trim();
  if (!baseUrl || !token) return;

  await fetch(`${baseUrl}/api/agent/jobs/${jobId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, ...extra }),
  }).catch(() => undefined);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.login) {
    await runNaverLogin();
    return;
  }

  const config = await resolveAgentConfig({
    configPath: args.configPath ?? CONFIG_LOCAL_PATH,
    overrides: args.overrides,
  });

  const tone: Tone = config.tone ?? "friendly";
  let jobId = args.jobId ?? `local-${Date.now()}`;
  const jobDir = path.join(AGENT_OUTPUT_ROOT, jobId);
  let payload: AgentPayload;

  if (args.jobId) {
    const manifestPath = path.join(jobDir, "manifest.json");
    try {
      payload = await loadManifest(manifestPath);
    } catch {
      const remote = await fetchJobPayload(args.jobId);
      if (!remote) {
        console.error("job manifest 없음. JBAI_API_URL·AGENT_API_TOKEN 확인.");
        process.exit(1);
      }
      await fs.mkdir(jobDir, { recursive: true });
      await fs.writeFile(manifestPath, JSON.stringify(remote, null, 2));
      payload = remote;
    }
    console.log(`[job] ${args.jobId} 로드`);
  } else {
    const guideline =
      (await fetchGuidelineFromApi()) ||
      "네이버 블로그 SEO 최적화. 본문 1500~1800자. 이미지 6~8장.";

    console.log(`[1/4] 콘텐츠 기획 (모델: ${config.textModel})`);
    const result = await prepareAgentJob({
      config,
      guideline,
      tone,
      outputDir: jobDir,
      withImages: false,
    });
    payload = result.payload;
    console.log(`기획 완료: ${payload.totalChars}자, 이미지 슬롯 ${payload.imageCount}개`);
  }

  payload = await ensureImages(payload, jobDir, config);
  await fs.writeFile(
    path.join(jobDir, "manifest.json"),
    JSON.stringify(payload, null, 2),
  );

  if (args.prepareOnly) {
    console.log("준비만 완료 (--prepare-only). manifest:", path.join(jobDir, "manifest.json"));
    return;
  }

  console.log("[2/4] 네이버 로그인");
  await ensureNaverLogin(config, args.headless);

  if (jobId && !jobId.startsWith("local-")) {
    await updateJobStatus(jobId, "posting");
  }

  console.log(`[3/4] 글쓰기 + 이미지 삽입 (블로그: ${config.blogId})`);
  try {
    const { draftUrl } = await postNaverDraft(
      payload,
      jobDir,
      config.blogId,
      args.headless,
    );

    console.log("[4/4] 임시저장 완료");
    console.log(draftUrl);

    if (jobId && !jobId.startsWith("local-")) {
      await updateJobStatus(jobId, "draft_saved", { naver_draft_url: draftUrl });
    }

    await fs.writeFile(
      path.join(jobDir, "result.json"),
      JSON.stringify({ draftUrl, completedAt: new Date().toISOString() }, null, 2),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "포스팅 실패";
    console.error("에이전트 실패:", message);

    if (jobId && !jobId.startsWith("local-")) {
      await updateJobStatus(jobId, "failed", { error_message: message });
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
