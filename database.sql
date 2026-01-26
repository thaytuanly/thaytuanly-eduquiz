
-- HƯỚNG DẪN: Copy toàn bộ code này và dán vào SQL Editor của Supabase để chạy.

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

-- 2. Bảng lưu danh sách câu hỏi theo trận đấu
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  options JSONB, -- Lưu mảng đáp án [A, B, C, D]
  correct_answer TEXT,
  points INT DEFAULT 10,
  time_limit INT DEFAULT 30,
  media_url TEXT,
  media_type TEXT DEFAULT 'none',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bảng lưu danh sách học sinh tham gia
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INT DEFAULT 0,
  last_answer TEXT,
  response_time INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Hàm RPC để cập nhật điểm số (tránh lỗi race condition)
CREATE OR REPLACE FUNCTION increment_score(player_id UUID, add_points INT, ans TEXT, r_time INT)
RETURNS VOID AS $$
BEGIN
  UPDATE players
  SET 
    score = score + add_points,
    last_answer = ans,
    response_time = r_time
  WHERE id = player_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Mở quyền truy cập công khai cho demo (Disable RLS)
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
