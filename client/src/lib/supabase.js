import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ggndvjkruokzkkotskvr.supabase.co';
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbmR2amtydW9remtrb3Rza3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTgyNjEsImV4cCI6MjEwODY3NDI2MX0.09IPqxIFHYkijEUbWYJinD_wZ4aAhdXN9oxxhiXgydM';

export const supabaseUrl = rawSupabaseUrl?.trim() || '';
export const supabaseAnonKey = rawSupabaseAnonKey?.trim() || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey !== 'your-anon-public-key' &&
  supabaseAnonKey !== 'your-supabase-anon-public-key' &&
  !supabaseAnonKey.includes('placeholder')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[DocMind] Supabase credentials missing or unconfigured in client/.env. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live authentication.'
  );
}

// Instantiate client with persistence and automatic token refresh
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'docmind_auth_token',
    },
  }
);
