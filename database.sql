
-- HƯỚNG DẪN: Chạy đoạn code này trong SQL Editor của Supabase

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

-- 2. Đảm bảo bảng 'questions' hỗ trợ Media
ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'none';

-- 3. Đảm bảo bảng 'responses' có ràng buộc UNIQUE để upsert hoạt động
-- Xóa ràng buộc cũ nếu có để tránh xung đột
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'responses_player_id_question_id_key') THEN
        ALTER TABLE responses DROP CONSTRAINT responses_player_id_question_id_key;
    END IF;
END $$;

ALTER TABLE responses ADD CONSTRAINT responses_player_id_question_id_key UNIQUE (player_id, question_id);

-- 4. Tắt RLS để đảm bảo việc ghi dữ liệu từ máy tính học sinh không bị chặn
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
