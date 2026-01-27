
-- HƯỚNG DẪN: Chạy đoạn code này trong SQL Editor của Supabase

-- 1. Bảng lưu thông tin trận đấu
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'LOBBY',
  current_question_index INT DEFAULT -1,
  timer INT DEFAULT 0,
  active_buzzer_player_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng lưu danh sách câu hỏi
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  points INT DEFAULT 10,
  time_limit INT DEFAULT 30,
  media_url TEXT,
  media_type TEXT DEFAULT 'none',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bảng lưu danh sách thí sinh
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. BẢNG MỚI: Lưu chi tiết câu trả lời (History)
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  answer TEXT,
  is_correct BOOLEAN,
  response_time INT, -- ms
  points_earned INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, question_id) -- Mỗi người chỉ được trả lời 1 lần cho 1 câu
);

-- 5. Mở quyền truy cập
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
