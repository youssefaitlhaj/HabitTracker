import { useState, type DragEvent } from 'react';
import { formatLong, todayIn } from '@/domain/date';
import { IMPORT_MAX_BYTES, parseImport, type ImportSummary } from '@/domain/transfer';
import type { Snapshot } from '@/domain/types';
import { readFileText } from '@/lib/download';
import type { Ledger } from '@/state/ledger';
import { errorText } from '@/state/mutations';
import { useDataTransfer, type ImportMode } from '@/state/transfer';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { Icon } from '@/ui/Icon';
import { useToast } from '@/ui/Toast';
import { SettingsCard } from './SettingsPage';

const plural = (n: number, word: string) => `${n.toLocaleString('en')} ${word}${n === 1 ? '' : 's'}`;
const describe = (s: ImportSummary) => `${plural(s.habits, 'habit')} · ${plural(s.checkins, 'check-in')} · ${plural(s.notes, 'note')}`;

export function DataTab({ ledger }: { ledger: Ledger }) {
  const { profile } = ledger;
  const { exportAll, importSnapshot } = useDataTransfer(profile.timezone);
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  return (
    <>
      <SettingsCard title="Export your data" titleId="export-h" description="One JSON file with every habit, check-in, note and setting. Yours to keep, back up or move elsewhere.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-muted">
            Last export: {profile.lastExportAt ? formatLong(todayIn(profile.timezone, new Date(profile.lastExportAt))) : 'never'}
          </span>
          <Button
            icon="download"
            loading={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                toast.show(`${await exportAll()} is downloading.`, { kind: 'success' });
              } catch (error) {
                toast.show(errorText(error), { kind: 'error' });
              } finally {
                setExporting(false);
              }
            }}
          >
            Export JSON
          </Button>
        </div>
      </SettingsCard>
      <ImportCard onImport={importSnapshot} />
    </>
  );
}

interface Picked {
  fileName: string;
  snapshot: Snapshot;
  summary: ImportSummary;
}

function ImportCard({ onImport }: { onImport: (s: Snapshot, mode: ImportMode) => Promise<ImportSummary> }) {
  const toast = useToast();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const fail = (message: string) => {
    setPicked(null);
    setError(message);
    toast.show('Import failed. See the details above.', { kind: 'error' });
  };

  const read = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > IMPORT_MAX_BYTES) return fail('That file is larger than 10 MB.');
    const result = parseImport(await readFileText(file));
    if (!result.ok) return fail(result.error);
    setError('');
    setPicked({ fileName: file.name, snapshot: result.snapshot, summary: result.summary });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void read(e.dataTransfer.files[0]);
  };

  const run = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      const summary = await onImport(picked.snapshot, mode);
      toast.show(mode === 'replace' ? `Data replaced: ${describe(summary)}.` : `Imported and merged: ${describe(summary)}.`, { kind: 'success' });
      setPicked(null);
    } catch (err) {
      toast.show(`Import failed, nothing was changed. ${errorText(err)}`, { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard title="Import data" titleId="import-h" description="Bring back a Ledger export. We check the file before anything changes.">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          'relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center focus-within:outline focus-within:outline-2 focus-within:outline-whisky',
          error ? 'border-[#C9A99E] bg-[#FBF3F0]' : dragging ? 'border-whisky bg-oat' : 'border-line-strong bg-paper',
        )}
      >
        <Icon name="upload" size={28} className="text-whisky" />
        <span className="font-semibold">Choose a .json file</span>
        <span className="text-[13px] text-muted">or drop it here · max 10 MB</span>
        <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void read(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      </label>

      {error && (
        <Banner kind="error" title="We couldn’t read that file">
          {error}
        </Banner>
      )}

      {picked && (
        <div className="flex flex-col gap-3.5 rounded-2xl bg-paper p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-field bg-cask font-mono text-[11px] text-amber" aria-hidden="true">
              JSON
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{picked.fileName}</span>
              <span className="text-[13px] text-muted">{describe(picked.summary)}</span>
            </div>
          </div>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-sm font-semibold">How should we import it?</legend>
            {(
              [
                { value: 'merge', label: 'Merge with my data', hint: 'Adds what’s new. When both have the same habit, the newer copy wins.' },
                { value: 'replace', label: 'Replace my data', hint: 'Downloads a backup, deletes your current habits and history, then imports the file.' },
              ] as const
            ).map((o) => (
              <label key={o.value} className={cx('flex cursor-pointer items-start gap-3 rounded-field border-[1.5px] bg-surface p-3.5', mode === o.value ? 'border-whisky' : 'border-line')}>
                <input type="radio" name="import-mode" checked={mode === o.value} onChange={() => setMode(o.value)} className="mt-0.5 h-5 w-5 shrink-0 accent-whisky" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{o.label}</span>
                  <span className="text-[13px] text-muted">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {mode === 'replace' && (
            <Banner kind="warning" title="This replaces everything">
              Your current habits, check-ins and notes will be deleted. A backup file downloads first.
            </Banner>
          )}
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="quiet" onClick={() => setPicked(null)}>
              Cancel
            </Button>
            <Button variant={mode === 'replace' ? 'danger' : 'primary'} loading={busy} onClick={run}>
              {mode === 'replace' ? 'Replace my data' : 'Import and merge'}
            </Button>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}
