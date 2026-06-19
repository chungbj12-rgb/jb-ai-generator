-- 2단계 AI 파이프라인: 토큰·비용 로그
CREATE TABLE IF NOT EXISTS blog_generation_log (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id       UUID        REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  stage         SMALLINT    NOT NULL CHECK (stage IN (1, 2)),
  provider      TEXT        NOT NULL,
  model         TEXT        NOT NULL,
  input_tokens  INTEGER     NOT NULL DEFAULT 0,
  output_tokens INTEGER     NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS blog_generation_log_post_id_idx
  ON blog_generation_log (post_id);

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS keyword TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS pipeline_status TEXT DEFAULT 'completed';

ALTER TABLE blog_generation_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_generation_log' AND policyname = '본인 글 로그 조회'
  ) THEN
    CREATE POLICY "본인 글 로그 조회" ON blog_generation_log FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM blog_posts bp
        WHERE bp.id = post_id AND bp.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_generation_log' AND policyname = '본인 글 로그 생성'
  ) THEN
    CREATE POLICY "본인 글 로그 생성" ON blog_generation_log FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM blog_posts bp
        WHERE bp.id = post_id AND bp.user_id = auth.uid()
      )
    );
  END IF;
END $$;
