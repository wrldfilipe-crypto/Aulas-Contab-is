import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = ((import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('your-project')
);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    if (isSupabaseConfigured) {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'ais_supabase_auth_token',
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      console.info('[Supabase] Initialized official client connected to:', SUPABASE_URL);
    } else {
      // Create a dummy client to avoid crashes when credentials are placeholders
      const dummyUrl = 'https://placeholder-project.supabase.co';
      const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
      supabaseInstance = createClient(dummyUrl, dummyKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.warn('[Supabase] Running with local simulated client. Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY for live cloud storage.');
    }
  }
  return supabaseInstance;
}

export const supabase = getSupabase();
