-- user_answers 테이블에 manually_corrected 컬럼 추가

ALTER TABLE user_answers 
  ADD COLUMN IF NOT EXISTS manually_corrected BOOLEAN DEFAULT FALSE;

-- 기존 데이터에 대해서는 기본값 false 적용
UPDATE user_answers 
SET manually_corrected = FALSE 
WHERE manually_corrected IS NULL;

COMMENT ON COLUMN user_answers.manually_corrected IS 
  '사용자가 AI 채점을 무효화하고 수동으로 정답 처리한 경우 true';

