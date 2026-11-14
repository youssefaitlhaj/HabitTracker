import type { ReactNode } from 'react';
import { useLedger, type Ledger } from '@/state/ledger';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { LoadingScreen } from '@/ui/Display';

/**
 * Every signed-in screen renders through this: loading → the screen, or, when a collection
 * can't load, an error with Try again (never an endless loading screen).
 */
export function LedgerView({ children }: { children: (ledger: Ledger) => ReactNode }) {
  const { ledger, error, retry, retrying } = useLedger();
  if (error && !ledger) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-10">
        <Banner kind="error" title="Some of your data couldn’t load">
          {error.message}
        </Banner>
        <Button className="self-start" icon="restore" loading={retrying} onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }
  if (!ledger) return <LoadingScreen />;
  return <>{children(ledger)}</>;
}
