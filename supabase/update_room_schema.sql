-- ===================================
-- 방 생성 모드 및 채점 기준 추가
-- ===================================

-- 1. generation_mode: 문제 생성 방식
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS
  generation_mode TEXT DEFAULT 'user_data' 
  CHECK (generation_mode IN ('user_data', 'hybrid', 'ai_only'));

-- 2. grading_strictness: 주관식 채점 엄격도
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS
  grading_strictness TEXT DEFAULT 'normal'
  CHECK (grading_strictness IN ('strict', 'normal', 'lenient'));

-- 3. source_data: 사용자가 입력한 학습 자료 (텍스트 또는 파일 내용)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS
  source_data TEXT;

-- 4. fill_blank_ratio: 주관식 문제 비율 (0-100)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS
  fill_blank_ratio INTEGER DEFAULT 60
  CHECK (fill_blank_ratio >= 0 AND fill_blank_ratio <= 100);

-- 5. file_url: 업로드된 파일 URL (Supabase Storage)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS
  file_url TEXT;

-- 6. 기존 데이터 업데이트 (null 값 처리)
UPDATE rooms 
SET 
  generation_mode = COALESCE(generation_mode, 'ai_only'),
  grading_strictness = COALESCE(grading_strictness, 'normal'),
  fill_blank_ratio = COALESCE(fill_blank_ratio, 60)
WHERE generation_mode IS NULL 
   OR grading_strictness IS NULL 
   OR fill_blank_ratio IS NULL;

-- 확인: rooms 테이블 구조 출력
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms'
  AND column_name IN ('generation_mode', 'grading_strictness', 'source_data', 'fill_blank_ratio', 'file_url')
ORDER BY ordinal_position;

