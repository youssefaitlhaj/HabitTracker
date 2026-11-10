import { createLocalBackend } from './local/localBackend';
import { createSupabaseBackend } from './supabase/supabaseBackend';
import type { Backend } from './ports';

/** Picks the backend from the environment: Supabase when configured, demo mode otherwise. */
export function createBackend(env: ImportMetaEnv = import.meta.env): Backend {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  return url && key ? createSupabaseBackend(url, key) : createLocalBackend();
}
