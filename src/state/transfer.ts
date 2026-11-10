import { useCallback } from 'react';
import { nowIso } from '@/data/defaults';
import { todayIn } from '@/domain/date';
import { buildExport, exportFileName, mergeSnapshots, summarise, type ImportSummary } from '@/domain/transfer';
import type { Snapshot } from '@/domain/types';
import { downloadJson } from '@/lib/download';
import { useRefreshLedger } from './mutations';
import { useRepos } from './session';

export type ImportMode = 'merge' | 'replace';

/** Export and import (design §8.7). The UI only decides *when*; this decides *how*. */
export function useDataTransfer(timezone: string) {
  const { repos } = useRepos();
  const refresh = useRefreshLedger();

  const exportAll = useCallback(async (): Promise<string> => {
    const now = nowIso();
    const name = exportFileName(todayIn(timezone));
    downloadJson(name, buildExport(await repos.snapshots.load(), now));
    await repos.profiles.markExported(now);
    await refresh();
    return name;
  }, [repos, timezone, refresh]);

  const importSnapshot = useCallback(
    async (incoming: Snapshot, mode: ImportMode): Promise<ImportSummary> => {
      const current = await repos.snapshots.load();
      if (mode === 'replace') {
        downloadJson(exportFileName(todayIn(timezone)).replace('.json', '-backup.json'), buildExport(current, nowIso()));
      }
      await repos.snapshots.replace(mode === 'replace' ? incoming : mergeSnapshots(current, incoming));
      await refresh();
      return summarise(incoming);
    },
    [repos, timezone, refresh],
  );

  return { exportAll, importSnapshot };
}
