
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Function to handle missing configuration gracefully
const createSafeClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '⚠️ SUPABASE_URL hoặc SUPABASE_ANON_KEY chưa được thiết lập! Hãy kiểm tra Environment Variables trên Vercel.'
    );
    
    // Return a proxy that catches any property access to prevent crashes
    return new Proxy({}, {
      get: (target, prop) => {
        return () => {
          console.error(`Lỗi: Không thể thực hiện lệnh "${String(prop)}" do chưa cấu hình Supabase.`);
          return {
            from: () => ({
              select: () => ({ 
                eq: () => ({ 
                  single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }), 
                  order: () => Promise.resolve({ data: [], error: null }) 
                }),
                order: () => Promise.resolve({ data: [], error: null }) 
              }),
              insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
              update: () => ({ eq: () => Promise.resolve({ error: new Error('Supabase not configured') }) }),
              delete: () => ({ eq: () => Promise.resolve({ error: new Error('Supabase not configured') }) }),
            }),
            channel: () => ({ 
              on: () => ({ 
                on: () => ({ 
                  subscribe: () => ({}) 
                }),
                subscribe: () => ({}) 
              }),
              subscribe: () => ({}) 
            }),
            removeChannel: () => ({}),
            rpc: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          };
        };
      }
    }) as any;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createSafeClient();
