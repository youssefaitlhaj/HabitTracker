import { useCallback, useEffect, useState } from 'react';
import { currentDevice, permission, pushSupport, showTestNotification, subscribe, unsubscribe, type PushSupport } from '@/lib/push';
import { errorText } from './mutations';
import { useRepos } from './session';
import { useToast } from '@/ui/Toast';

export type ReminderStatus =
  | 'unavailable' // backend or keys can't send reminders
  | PushSupport
  | 'blocked' // the user denied notifications
  | 'off'
  | 'on';

/** Turns reminder notifications on or off for this device (design: Settings › Notifications). */
export function useDeviceReminders() {
  const { repos } = useRepos();
  const toast = useToast();
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  const [status, setStatus] = useState<ReminderStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const support = pushSupport();
    if (!repos.devices || !vapidKey) return setStatus('unavailable');
    if (support !== 'supported') return setStatus(support);
    if (permission() === 'denied') return setStatus('blocked');
    setStatus((await currentDevice()) ? 'on' : 'off');
  }, [repos.devices, vapidKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      toast.show(errorText(error), { kind: 'error' });
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const enable = () =>
    run(async () => {
      if (!repos.devices || !vapidKey) return;
      await repos.devices.register(await subscribe(vapidKey));
      toast.show('Reminders are on for this device.', { kind: 'success' });
    });

  const disable = () =>
    run(async () => {
      const endpoint = await unsubscribe();
      if (endpoint) await repos.devices?.unregister(endpoint);
      toast.show('Reminders are off for this device.');
    });

  const test = () => run(showTestNotification);

  return { status, busy, enable, disable, test };
}
