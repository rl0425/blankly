// User Types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  nickname: string;
  total_solved: number;
  total_correct: number;
  streak_days: number;
  created_at: string;
  updated_at: string;
}

// Project Types
export type ProjectCategory = '영어' | '코딩' | '자격증' | '기타';
export type SourceType = 'prompt' | 'data_upload';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: ProjectCategory;
  source_type: SourceType;
  source_data?: Record<string, unknown>;
  total_rooms: number;
  completed_rooms: number;
  is_active: boolean;
  sort_order?: number; // 프로젝트 표시 순서 (높을수록 앞에 표시)
  created_at: string;
  updated_at: string;
}

// Room Types
export type ProblemType = 'multiple_choice' | 'fill_blank' | 'essay';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type RoomStatus = 'not_started' | 'in_progress' | 'completed';

export interface Room {
  id: string;
  project_id: string;
  title: string;
  day_number: number;
  prompt_template?: string;
  total_problems: number;
  problem_type: ProblemType;
  difficulty: Difficulty;
  status: RoomStatus;
  created_at: string;
  updated_at: string;
}

// Problem Types
export type QuestionType = 'multiple_choice' | 'multiple_select' | 'fill_blank' | 'essay';

export interface Problem {
  id: string;
  room_id: string;
  question: string;
  question_type: QuestionType;
  options?: string[];
  correct_answer: string;
  explanation?: string;
  difficulty: Difficulty;
  order_number: number;
  max_length?: number; // 서술형 문제용 최대 글자 수 (예: 50, 100)
  created_at: string;
  metadata?: Record<string, unknown>;
}

// User Answer Types
export interface UserAnswer {
  id: string;
  user_id: string;
  problem_id: string;
  room_id: string;
  user_answer: string;
  is_correct: boolean;
  attempt_number: number;
  time_spent?: number;
  created_at: string;
  reviewed_at?: string;
}

// Room Session Types
export interface RoomSession {
  id: string;
  user_id: string;
  room_id: string;
  total_problems: number;
  solved_count: number;
  correct_count: number;
  wrong_count: number;
  start_time: string;
  end_time?: string;
  is_completed: boolean;
  completed_at?: string;
}

// Wrong Problem Types
export interface WrongProblem {
  id: string;
  user_id: string;
  problem_id: string;
  user_answer_id: string;
  review_count: number;
  is_mastered: boolean;
  last_reviewed_at?: string;
  created_at: string;
  problem?: Problem;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// AI Types
export interface AIGenerateRequest {
  topic: string;
  difficulty: Difficulty;
  count: number;
  type: ProblemType;
  sourceData?: string;
}

export interface AIGradeRequest {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  type: QuestionType;
}

export interface AIGradeResponse {
  is_correct: boolean;
  score: number;
  feedback: string;
  improvement_tip?: string;
}

// Supabase JOIN Types
export interface RoomWithProject {
  projects: { deleted_at: string | null };
  deleted_at: string | null;
  grading_strictness?: string;
  project_id: string;
}

