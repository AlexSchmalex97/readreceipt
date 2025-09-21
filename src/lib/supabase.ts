import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON;

// Flag to check if Supabase is usable
export const hasSupabase = Boolean(url && anon);

// Export a client if keys exist, otherwise null
export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(url as string, anon as string)
  : null;
