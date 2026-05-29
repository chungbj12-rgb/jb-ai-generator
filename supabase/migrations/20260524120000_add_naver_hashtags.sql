-- 네이버 블로그 추천 해시태그 저장
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS naver_hashtags TEXT[];
