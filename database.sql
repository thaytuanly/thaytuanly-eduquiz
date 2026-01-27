
-- HƯỚNG DẪN: Sao chép toàn bộ mã này vào SQL Editor của Supabase và nhấn RUN.

-- 1. Đảm bảo bảng matches có đầy đủ các cột cần thiết cho việc đồng bộ
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'LOBBY',
  current_question_index INT DEFAULT -1,
  timer INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Lệnh bổ sung cột question_started_at nếu chưa có (Tránh lỗi schema cache)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='question_started_at') THEN
    ALTER TABLE matches ADD COLUMN question_started_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 3. Lệnh bổ sung các cột buzzer nếu chưa có
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='buzzer_p1_id') THEN
    ALTER TABLE matches ADD COLUMN buzzer_p1_id UUID;
    ALTER TABLE matches ADD COLUMN buzzer_t1 BIGINT;
    ALTER TABLE matches ADD COLUMN buzzer_p2_id UUID;
    ALTER TABLE matches ADD COLUMN buzzer_t2 BIGINT;
    ALTER TABLE matches ADD COLUMN active_buzzer_player_id UUID;
  END IF;
END $$;

-- 4. Tạo các bảng phụ nếu chưa tồn tại
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

CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  answer TEXT,
  is_correct BOOLEAN DEFAULT false,
  response_time INT DEFAULT 0,
  points_earned INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT responses_player_id_question_id_unique UNIQUE (player_id, question_id)
);

-- 5. Tắt bảo mật (RLS) để ứng dụng hoạt động ngay lập tức
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;

-- 6. Kích hoạt Realtime (Chạy lệnh này trong SQL Editor)
-- LƯU Ý: Nếu đã bật trong giao diện Supabase thì không cần lệnh này
-- alter publication supabase_realtime add table matches, questions, players, responses;
