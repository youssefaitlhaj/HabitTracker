import { useQuery } from '@tanstack/react-query';
import { useRepos } from './session';

/** Admin side of demo feedback: who may read it, and the list itself. */

const feedbackKey = (userId: string, part: 'admin' | 'list') => ['feedback', userId, part] as const;

/** True or false once checked; undefined while checking. */
export function useIsAdmin(): boolean | undefined {
  const { repos, session } = useRepos();
  const { data } = useQuery({
    queryKey: feedbackKey(session.userId, 'admin'),
    queryFn: () => repos.feedback?.isAdmin() ?? false,
    staleTime: Infinity,
  });
  return data;
}

export function useDemoFeedback() {
  const { repos, session } = useRepos();
  return useQuery({
    queryKey: feedbackKey(session.userId, 'list'),
    queryFn: () => repos.feedback?.list() ?? [],
  });
}
