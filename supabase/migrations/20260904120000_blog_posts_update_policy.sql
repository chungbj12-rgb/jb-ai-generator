-- blog_posts RLS에 UPDATE 정책이 없어 파이프라인 최종 본문 저장(update)이
-- 에러 없이 0건 처리되던 문제 수정.
-- 증상: 히스토리 "보기" 클릭 시 naver_content/thread_content가 NULL이라 본문이 비어 보임.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts' AND policyname = '본인 글만 수정 가능'
  ) THEN
    CREATE POLICY "본인 글만 수정 가능" ON blog_posts
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
