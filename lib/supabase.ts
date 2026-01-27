
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Thông tin kết nối trực tiếp do người dùng cung cấp
const supabaseUrl = 'https://ioazpmliqgwatcepyuqf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvYXpwbWxpcWd3YXRjZXB5dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzM0NzEsImV4cCI6MjA4NTAwOTQ3MX0.lbTAPbzAMzHK3vJYsnrAg8K8x7rFuJ2q_xABoj5vbt0';

// Khởi tạo client trực tiếp
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
