import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgentJob, updateAgentJob } from "@/lib/agent/job-service";
import type { AgentJobStatus } from "@/types/agent";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isAgentTokenAuthorized(request: NextRequest): boolean {
  const token = process.env.AGENT_API_TOKEN?.trim();
  if (!token) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${token}`;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const tokenAuth = isAgentTokenAuthorized(request);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !tokenAuth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const job = await getAgentJob(id);
  if (!job) {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!tokenAuth && user && job.user_id !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json({ job });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tokenAuth = isAgentTokenAuthorized(request);
  if (!user && !tokenAuth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const job = await getAgentJob(id);
  if (!job) {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!tokenAuth && user && job.user_id !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json();
  const status = body.status as AgentJobStatus | undefined;

  const updated = await updateAgentJob(id, {
    status,
    naver_draft_url: body.naver_draft_url,
    error_message: body.error_message,
  });

  return NextResponse.json({ job: updated });
}
