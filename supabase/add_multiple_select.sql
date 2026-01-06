-- multiple_select 타입 추가

-- 1. problems 테이블의 CHECK 제약 조건 삭제
ALTER TABLE problems 
  DROP CONSTRAINT IF EXISTS problems_question_type_check;

-- 2. 새로운 CHECK 제약 조건 추가 (multiple_select 포함)
ALTER TABLE problems 
  ADD CONSTRAINT problems_question_type_check 
  CHECK (question_type IN ('multiple_choice', 'multiple_select', 'fill_blank'));

-- 3. room의 problem_type도 업데이트
ALTER TABLE rooms
  DROP CONSTRAINT IF EXISTS rooms_problem_type_check;

ALTER TABLE rooms
  ADD CONSTRAINT rooms_problem_type_check
  CHECK (problem_type IN ('multiple_choice', 'multiple_select', 'fill_blank', 'essay'));

