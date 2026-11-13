import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Repositories } from '@/data/ports';
import { useToast } from '@/ui/Toast';
import { ledgerKey, type LedgerPart, type PartData } from './ledger';
import { useRepos } from './session';

/**
 * The one way the app changes data: update the screen immediately, save in the background,
 * and roll back with an error toast (and Retry) if saving fails (design §8.8).
 */
interface OptimisticOptions<K extends LedgerPart, V> {
  part: K;
  apply: (current: PartData[K], vars: V) => PartData[K];
  run: (repos: Repositories, vars: V) => Promise<unknown>;
  errorMessage: string;
}

export function useOptimistic<K extends LedgerPart, V>({ part, apply, run, errorMessage }: OptimisticOptions<K, V>) {
  const { repos, session } = useRepos();
  const queryClient = useQueryClient();
  const toast = useToast();
  const key = ledgerKey(session.userId, part);

  const mutation = useMutation({
    mutationFn: (vars: V) => run(repos, vars),
    onMutate: async (vars: V) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PartData[K]>(key);
      if (previous !== undefined) queryClient.setQueryData<PartData[K]>(key, apply(previous, vars));
      return { previous };
    },
    onError: (_error, vars, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(key, context.previous);
      toast.show(errorMessage, { kind: 'error', action: { label: 'Retry', run: () => mutation.mutate(vars) } });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return mutation;
}

/** Re-fetches every collection (after an import, or on pull-to-refresh). Resolves true when all loaded. */
export function useRefreshLedger() {
  const { session } = useRepos();
  const queryClient = useQueryClient();
  return useCallback(async (): Promise<boolean> => {
    const queryKey = ['ledger', session.userId];
    await queryClient.invalidateQueries({ queryKey });
    return !queryClient.getQueryCache().findAll({ queryKey }).some((q) => q.state.status === 'error');
  }, [queryClient, session.userId]);
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
