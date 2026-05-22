-- blog_posts 테이블 (현재 앱 스키마)
CREATE TABLE IF NOT EXISTS blog_posts (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic          TEXT        NOT NULL,
  tone           TEXT        NOT NULL,
  naver_content  TEXT,
  thread_content TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS blog_posts_user_id_created_at_idx
  ON blog_posts (user_id, created_at DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = '본인 글만 조회 가능'
  ) THEN
    CREATE POLICY "본인 글만 조회 가능" ON blog_posts FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = '본인 글만 생성 가능'
  ) THEN
    CREATE POLICY "본인 글만 생성 가능" ON blog_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = '본인 글만 삭제 가능'
  ) THEN
    CREATE POLICY "본인 글만 삭제 가능" ON blog_posts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
