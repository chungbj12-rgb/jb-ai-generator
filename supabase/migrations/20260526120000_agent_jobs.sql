-- 네이버 블로그 자동화 에이전트 작업 테이블
create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  tone text not null check (tone in ('friendly', 'professional', 'emotional')),
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'posting', 'draft_saved', 'failed')),
  payload jsonb,
  naver_draft_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_jobs_user_id_idx on public.agent_jobs(user_id);
create index if not exists agent_jobs_status_idx on public.agent_jobs(status);

alter table public.agent_jobs enable row level security;

create policy "Users can view own agent jobs"
  on public.agent_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own agent jobs"
  on public.agent_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own agent jobs"
  on public.agent_jobs for update
  using (auth.uid() = user_id);
