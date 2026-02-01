
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Thông tin kết nối trực tiếp do người dùng cung cấp
const supabaseUrl = '';
const supabaseAnonKey = '';

// Khởi tạo client trực tiếp
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
