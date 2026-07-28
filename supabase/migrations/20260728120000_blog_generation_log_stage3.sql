-- 3단계 AI 파이프라인: Claude(사람이 쓴 것처럼 다듬기) stage=3 허용
ALTER TABLE blog_generation_log DROP CONSTRAINT IF EXISTS blog_generation_log_stage_check;
ALTER TABLE blog_generation_log ADD CONSTRAINT blog_generation_log_stage_check CHECK (stage IN (1, 2, 3));
