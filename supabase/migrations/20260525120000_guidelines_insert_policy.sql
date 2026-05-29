-- 지침 신규 추가(upsert) 허용
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prompt_guidelines' AND policyname = '로그인 유저 삽입 가능'
  ) THEN
    CREATE POLICY "로그인 유저 삽입 가능" ON prompt_guidelines
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
