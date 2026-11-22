import { demoRequested, leaveDemo } from './demo/demoMode';
import type { FirebaseSettings } from './firebase/firebaseBackend';
import type { Backend } from './ports';

function firebaseSettings(env: ImportMetaEnv): FirebaseSettings | null {
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID) return null;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID ?? '',
  };
}

/**
 * Picks the backend: the sample-data demo when this tab is in it (/demo), otherwise from the
 * environment: Firebase, then Supabase, then the in-browser backend.
 * Each one is loaded on demand, so a deployment only downloads the SDK it uses.
 */
export async function createBackend(env: ImportMetaEnv = import.meta.env, path: string = window.location.pathname): Promise<Backend> {
  const firebase = firebaseSettings(env);
  const demo = demoRequested(path);
  if (demo.active) {
    const [{ createDemoBackend }, { createFeedbackSender }] = await Promise.all([import('./demo/demoBackend'), import('./firebase/feedbackSender')]);
    // Feedback needs somewhere to go; without Firebase, "Exit demo" just leaves.
    return createDemoBackend({ fresh: demo.fresh, onExit: () => leaveDemo(), feedback: firebase ? createFeedbackSender(firebase) : undefined });
  }
  if (firebase) {
    const { createFirebaseBackend } = await import('./firebase/firebaseBackend');
    return createFirebaseBackend(firebase);
  }
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
    const { createSupabaseBackend } = await import('./supabase/supabaseBackend');
    return createSupabaseBackend(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  }
  const { createLocalBackend } = await import('./local/localBackend');
  return createLocalBackend();
}
