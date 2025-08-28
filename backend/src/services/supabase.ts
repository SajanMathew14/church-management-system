import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a Supabase client with service role key for backend operations
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create a client for user-specific operations (with user JWT)
export const createUserSupabaseClient = (userToken: string): SupabaseClient => {
  return createClient(supabaseUrl, process.env['SUPABASE_ANON_KEY']!, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
  });
};

export default supabase;
