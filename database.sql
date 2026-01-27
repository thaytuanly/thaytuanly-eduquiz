
-- HƯỚNG DẪN: Sao chép toàn bộ đoạn mã này và dán vào SQL Editor trong Supabase, sau đó nhấn RUN.

-- 1. Đảm bảo bảng 'matches' có đầy đủ các cột cho tính năng bấm chuông
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'LOBBY',
  current_question_index INT DEFAULT -1,
  timer INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS buzzer_p1_id UUID REFERENCES players(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS buzzer_t1 BIGINT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS buzzer_p2_id UUID REFERENCES players(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS buzzer_t2 BIGINT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS active_buzzer_player_id UUID; -- Cột cũ dùng cho logic cũ (nếu cần)

-- 2. Đảm bảo bảng 'questions' có đầy đủ các cột cho Media
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  points INT DEFAULT 10,
  time_limit INT DEFAULT 30,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'none';

-- 3. Đảm bảo bảng 'players'
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Đảm bảo bảng 'responses'
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  answer TEXT,
  is_correct BOOLEAN,
  response_time INT,
  points_earned INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, question_id)
);

-- 5. Mở quyền truy cập cho tất cả các bảng (Tắt RLS)
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
