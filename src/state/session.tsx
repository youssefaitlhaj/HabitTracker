import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Backend, Repositories, Session } from '@/data/ports';

/** Provides the backend (chosen once at start-up) and the signed-in user's repositories. */

const BackendContext = createContext<Backend | null>(null);

interface SessionValue {
  session: Session | null;
  ready: boolean;
  repos: Repositories | null;
}

const SessionContext = createContext<SessionValue>({ session: null, ready: false, repos: null });

export function BackendProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  return (
    <BackendContext.Provider value={backend}>
      <SessionProvider backend={backend}>{children}</SessionProvider>
    </BackendContext.Provider>
  );
}

function SessionProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    backend.auth.getSession().then((s) => {
      if (!alive) return;
      setSession(s);
      setReady(true);
    });
    const unsubscribe = backend.auth.onSessionChange((s) => {
      setSession((prev) => {
        if (prev?.userId !== s?.userId) queryClient.clear();
        return s;
      });
      setReady(true);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [backend, queryClient]);

  const userId = session?.userId;
  const repos = useMemo(() => (session ? backend.repositoriesFor(session) : null), [backend, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ session, ready, repos }), [session, ready, repos]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useBackend(): Backend {
  const backend = useContext(BackendContext);
  if (!backend) throw new Error('useBackend must be used inside <BackendProvider>');
  return backend;
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}

/** Repositories of the signed-in user. Only call inside signed-in routes. */
export function useRepos(): { repos: Repositories; session: Session } {
  const { repos, session } = useSession();
  if (!repos || !session) throw new Error('No signed-in user');
  return { repos, session };
}
