import { useEffect } from 'react';
import { useToast } from '@/ui/Toast';

/** Tells the user when they go offline (their changes stay on the device) and when they're back. */
export function useConnectionToasts(): void {
  const toast = useToast();
  useEffect(() => {
    const offline = () => toast.show('You’re offline. Changes are kept on this device and sync when you’re back online.');
    const online = () => toast.show('Back online.', { kind: 'success' });
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [toast]);
}
