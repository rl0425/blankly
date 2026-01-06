-- ===================================
-- Blankly Database Schema
-- ===================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- 1. User Profiles Table
-- ===================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  total_solved INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ===================================
-- 2. Projects Table
-- ===================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('영어', '코딩', '자격증', '기타')),
  source_type TEXT NOT NULL CHECK (source_type IN ('prompt', 'data_upload')),
  source_data JSONB,
  original_content TEXT,
  processed_content JSONB,
  file_url TEXT,
  total_rooms INTEGER DEFAULT 0,
  completed_rooms INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ===================================
-- 3. Rooms Table
-- ===================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  prompt_template TEXT,
  total_problems INTEGER DEFAULT 0,
  problem_type TEXT NOT NULL CHECK (problem_type IN ('multiple_choice', 'fill_blank', 'essay')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rooms of own projects"
  ON rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rooms.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rooms for own projects"
  ON rooms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rooms.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rooms of own projects"
  ON rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rooms.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rooms of own projects"
  ON rooms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rooms.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ===================================
-- 4. Problems Table
-- ===================================
CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'fill_blank')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  order_number INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for problems
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view problems of own projects"
  ON problems FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN projects ON projects.id = rooms.project_id
      WHERE rooms.id = problems.room_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert problems for own projects"
  ON problems FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN projects ON projects.id = rooms.project_id
      WHERE rooms.id = problems.room_id
      AND projects.user_id = auth.uid()
    )
  );

-- ===================================
-- 5. User Answers Table
-- ===================================
CREATE TABLE IF NOT EXISTS user_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  time_spent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- RLS for user_answers
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers"
  ON user_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers"
  ON user_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers"
  ON user_answers FOR UPDATE
  USING (auth.uid() = user_id);

-- ===================================
-- 6. Room Sessions Table
-- ===================================
CREATE TABLE IF NOT EXISTS room_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  total_problems INTEGER NOT NULL,
  solved_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- RLS for room_sessions
ALTER TABLE room_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON room_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON room_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON room_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ===================================
-- 7. Wrong Problems Table
-- ===================================
CREATE TABLE IF NOT EXISTS wrong_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_answer_id UUID NOT NULL REFERENCES user_answers(id) ON DELETE CASCADE,
  review_count INTEGER DEFAULT 0,
  is_mastered BOOLEAN DEFAULT FALSE,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for wrong_problems
ALTER TABLE wrong_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wrong problems"
  ON wrong_problems FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wrong problems"
  ON wrong_problems FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wrong problems"
  ON wrong_problems FOR UPDATE
  USING (auth.uid() = user_id);

-- ===================================
-- 8. Content Segments Table (for AI-generated blanks)
-- ===================================
CREATE TABLE IF NOT EXISTS content_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  original_sentence TEXT NOT NULL,
  blank_version TEXT NOT NULL,
  blanked_words JSONB NOT NULL,
  segment_order INTEGER NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for content_segments
ALTER TABLE content_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view segments of own projects"
  ON content_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = content_segments.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert segments for own projects"
  ON content_segments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = content_segments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ===================================
-- Indexes for Performance
-- ===================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_project_id ON rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_problems_room_id ON problems(room_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_problem_id ON user_answers(problem_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_user_id ON room_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wrong_problems_user_id ON wrong_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_content_segments_project_id ON content_segments(project_id);

-- ===================================
-- Functions & Triggers
-- ===================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

