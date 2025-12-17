import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';
import { SUPABASE_CONFIG } from './config';

// Credentials are now managed in lib/config.ts
const supabaseUrl = SUPABASE_CONFIG.URL;
const supabaseAnonKey = SUPABASE_CONFIG.ANON_KEY;

export const isSupabaseConfigured = 
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

// We only create a client if the credentials are provided.
// The UI in App.tsx will guide the user to configure this if it's missing.
export const supabase = isSupabaseConfigured 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;
