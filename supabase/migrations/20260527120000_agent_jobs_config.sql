-- agent_jobs에 실행 설정(config) 컬럼 추가
alter table public.agent_jobs
  add column if not exists config jsonb;
