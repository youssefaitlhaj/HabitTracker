import { Navigate } from 'react-router-dom';
import { useDemoFeedback, useIsAdmin } from '@/state/feedback';
import type { Ledger } from '@/state/ledger';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { EmptyState, Skeleton } from '@/ui/Display';
import { SettingsCard } from './SettingsPage';

/** Admins only: what demo visitors wrote when they left the demo, newest first. */

function sentAt(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(iso));
}

export function FeedbackTab({ ledger }: { ledger: Ledger }) {
  const feedback = useDemoFeedback();
  const count = feedback.data?.length ?? 0;

  return (
    <SettingsCard
      title="Demo feedback"
      titleId="feedback-h"
      description={feedback.data ? `${count} ${count === 1 ? 'message' : 'messages'} from people leaving the demo. Anonymous: only the text and the time are saved.` : 'What people wrote when leaving the demo.'}
    >
      {feedback.isPending ? (
        <Skeleton className="h-24" />
      ) : feedback.isError ? (
        <Banner kind="error" title="Couldn’t load the feedback" action={<Button size="sm" variant="secondary" onClick={() => void feedback.refetch()}>Try again</Button>}>
          Check your connection, and that the latest Firestore rules are published.
        </Banner>
      ) : count === 0 ? (
        <EmptyState icon="note" title="No feedback yet">
          It appears here when someone leaves the demo and writes a few words.
        </EmptyState>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {feedback.data.map((item) => (
            <li key={item.id} className="flex flex-col gap-1.5 border-t border-line-soft py-4 first:border-t-0 first:pt-0 last:pb-0">
              <time dateTime={item.createdAt} className="text-xs font-semibold uppercase tracking-wide text-muted">
                {sentAt(item.createdAt, ledger.profile.timezone)}
              </time>
              <p className="m-0 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{item.text}</p>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}

/** Shown on the admin tab while checking access; people who aren't admins go back to Settings. */
export function AdminGate() {
  const admin = useIsAdmin();
  if (admin === false) return <Navigate to="/settings" replace />;
  return <Skeleton className="h-40" />;
}
