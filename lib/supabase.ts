import { createClient } from '@supabase/supabase-js';

// 1. Sử dụng import.meta.env thay cho process.env
// 2. Sử dụng tên biến có tiền tố VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Kiểm tra nhanh để debug (f12 trên trình duyệt sẽ thấy lỗi nếu thiếu biến)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Lỗi: Thiếu biến môi trường VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
