
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Sử dụng biến môi trường từ Vercel thay vì hardcode
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Khởi tạo client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
