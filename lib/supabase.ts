
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Function to handle missing configuration gracefully
const createSafeClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      'Supabase configuration is missing! If you are seeing this on Vercel, please add SUPABASE_URL and SUPABASE_ANON_KEY to your Project Environment Variables.'
    );
    
    // Return a proxy that catches any property access to prevent crashes
    return new Proxy({}, {
      get: (target, prop) => {
        return () => {
          console.error(`Supabase call to "${String(prop)}" failed because the client is not configured.`);
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
