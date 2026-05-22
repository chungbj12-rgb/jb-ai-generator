-- AI로 생성한 글 저장 테이블 (레거시 posts)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  platform text not null check (platform in ('naver', 'threads')),
  tone text not null check (tone in ('friendly', 'professional', 'emotional')),
  content text not null,
  created_at timestamptz not null default now()
);

comment on table public.posts is 'AI 블로그 글 생성기에서 저장한 글';

create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;
