import { createClient, SupabaseClient } from "@supabase/supabase-js";

const env = (import.meta as any).env || {};
const supabaseUrl = (env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("http") &&
  !supabaseUrl.includes("your-project")
);

// Fallback dummy credentials to prevent client initialization crashes if keys are not yet configured in UI
const safeUrl = isSupabaseConfigured ? supabaseUrl : "https://placeholder-project.supabase.co";
const safeKey = isSupabaseConfigured ? supabaseAnonKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

export const supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    storageKey: "cu-auth",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export function getSupabase(): SupabaseClient {
  return supabase;
}
