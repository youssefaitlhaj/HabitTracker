import { useDeviceReminders } from '@/state/reminders';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Switch } from '@/ui/Choice';
import { Skeleton } from '@/ui/Display';
import { SettingsCard, SettingsRow } from './SettingsPage';

/** Why reminders can't be turned on here, when they can't. */
const BLOCKERS = {
  unavailable: {
    kind: 'info',
    title: 'Reminders aren’t set up yet',
    text: 'This version of Ledger isn’t connected to the reminder service. The README explains the setup.',
  },
  'needs-install': {
    kind: 'info',
    title: 'Add Ledger to your Home Screen first',
    text: 'On iPhone and iPad, tap Share › Add to Home Screen, then open Ledger from there and come back to this page.',
  },
  unsupported: { kind: 'warning', title: 'This browser can’t show notifications', text: 'Try a recent Chrome, Edge, Firefox or Safari.' },
  blocked: {
    kind: 'warning',
    title: 'Notifications are blocked',
    text: 'Allow notifications for this site in your browser or phone settings, then reload this page.',
  },
} as const;

export function NotificationsTab() {
  const { status, busy, enable, disable, test } = useDeviceReminders();
  const blocker = status && status in BLOCKERS ? BLOCKERS[status as keyof typeof BLOCKERS] : null;

  return (
    <SettingsCard
      title="Notifications"
      titleId="notifications-h"
      description="Get a reminder at each habit’s reminder time if it isn’t done yet. Set the time when you create or edit a habit. Reminders can arrive a few minutes late."
    >
      {status === null ? (
        <Skeleton className="h-12" />
      ) : blocker ? (
        <Banner kind={blocker.kind} title={blocker.title}>
          {blocker.text}
        </Banner>
      ) : (
        <>
          <SettingsRow label="Reminders on this device" hint="Each phone or computer is turned on separately.">
            <Switch label="Reminders on this device" checked={status === 'on'} disabled={busy} onChange={(on) => (on ? enable() : disable())} />
          </SettingsRow>
          {status === 'on' && (
            <SettingsRow label="Check it works" hint="Shows a notification on this device right now.">
              <Button size="sm" variant="secondary" loading={busy} onClick={test}>
                Send a test
              </Button>
            </SettingsRow>
          )}
        </>
      )}
    </SettingsCard>
  );
}
