-- blog_generation_log: 3단계(Claude) stage 값 허용
ALTER TABLE blog_generation_log
  DROP CONSTRAINT IF EXISTS blog_generation_log_stage_check;

ALTER TABLE blog_generation_log
  ADD CONSTRAINT blog_generation_log_stage_check
  CHECK (stage IN (1, 2, 3));
