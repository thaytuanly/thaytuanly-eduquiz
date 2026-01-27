
-- HƯỚNG DẪN: Chạy đoạn code này trong SQL Editor của Supabase

-- 1. Đảm bảo các bảng cơ bản tồn tại
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'LOBBY',
  current_question_index INT DEFAULT -1,
  timer INT DEFAULT 0,
  buzzer_p1_id UUID,
  buzzer_t1 BIGINT,
  buzzer_p2_id UUID,
  buzzer_t2 BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Cấu trúc bảng responses (Xóa và tạo lại để đảm bảo sạch sẽ nếu cần)
-- Lưu ý: Nếu bạn có dữ liệu quan trọng, hãy dùng ALTER TABLE thay thế
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  answer TEXT,
  is_correct BOOLEAN DEFAULT false,
  response_time INT DEFAULT 0,
  points_earned INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Thiết lập ràng buộc UNIQUE (Quan trọng nhất cho lệnh upsert)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'responses_player_id_question_id_unique') THEN
        ALTER TABLE responses ADD CONSTRAINT responses_player_id_question_id_unique UNIQUE (player_id, question_id);
    END IF;
END $$;

-- 4. Vô hiệu hóa RLS để tránh lỗi phân quyền khi client gửi dữ liệu
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
