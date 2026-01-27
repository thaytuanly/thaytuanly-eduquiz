
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Truy xuất biến môi trường
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

/**
 * Tạo một Proxy đệ quy để giả lập Supabase Client.
 * Mục đích: Cho phép gọi chuỗi lệnh (chaining) như .from().select().eq() 
 * mà không gây lỗi crash "is not a function" khi biến môi trường bị thiếu.
 */
const createDummyClient = () => {
  console.warn(
    '⚠️ CẢNH BÁO: SUPABASE_URL hoặc SUPABASE_ANON_KEY chưa được thiết lập trên Vercel.\n' +
    'Vui lòng kiểm tra mục Settings -> Environment Variables và REDEPLOY lại dự án.'
  );

  const handler: ProxyHandler<any> = {
    get(target, prop) {
      // Nếu là các hàm xử lý Promise (async/await)
      if (prop === 'then') {
        return (resolve: any) => resolve({ data: null, error: new Error('Supabase not configured') });
      }

      // Trả về một hàm mà khi gọi sẽ lại trả về chính Proxy này (để hỗ trợ chaining)
      return () => new Proxy({}, handler);
    }
  };

  return new Proxy({}, handler);
};

// Khởi tạo client thật hoặc giả lập nếu thiếu config
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : createDummyClient();
