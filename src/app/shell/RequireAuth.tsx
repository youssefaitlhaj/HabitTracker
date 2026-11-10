import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { HabitEditorProvider } from '@/features/habits/HabitEditor';
import { useHabits, useProfile } from '@/state/ledger';
import { useRefreshLedger } from '@/state/mutations';
import { useRepos, useSession } from '@/state/session';
import { LoadingScreen } from '@/ui/Display';
import { useToast } from '@/ui/Toast';

/** Guards signed-in routes and runs the once-per-sign-in effects. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const location = useLocation();
  if (!ready) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <HabitEditorProvider>
      <SignedInEffects />
      {children}
    </HabitEditorProvider>
  );
}

/** Logging in within 7 days cancels a pending account deletion (design §8.1). */
function SignedInEffects() {
  const { repos, session } = useRepos();
  const toast = useToast();
  const refresh = useRefreshLedger();
  const checked = useRef<string | null>(null);

  useEffect(() => {
    if (checked.current === session.userId) return;
    checked.current = session.userId;
    repos.profiles.cancelDeletion().then((cancelled) => {
      if (!cancelled) return;
      refresh();
      toast.show('Welcome back. Your account deletion has been cancelled.', { kind: 'success' });
    });
  }, [repos, session.userId, toast, refresh]);

  return null;
}

/** Sends brand-new users to the first-run setup once (design §8.10). */
export function FirstRunGate({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const habits = useHabits();
  if (!profile.data || !habits.data) return <LoadingScreen />;
  if (!profile.data.onboarded && habits.data.length === 0) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}
