import type { Backend } from './ports';

/**
 * Picks the backend from the environment: Firebase, then Supabase, then the in-browser demo.
 * Each one is loaded on demand, so a deployment only downloads the SDK it uses.
 */
export async function createBackend(env: ImportMetaEnv = import.meta.env): Promise<Backend> {
  if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
    const { createFirebaseBackend } = await import('./firebase/firebaseBackend');
    return createFirebaseBackend({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID ?? '',
    });
  }
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
    const { createSupabaseBackend } = await import('./supabase/supabaseBackend');
    return createSupabaseBackend(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  }
  const { createLocalBackend } = await import('./local/localBackend');
  return createLocalBackend();
}
