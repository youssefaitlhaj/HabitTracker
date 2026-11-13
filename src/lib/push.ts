import type { PushDevice } from '@/data/ports';

/** Browser side of reminder notifications: support checks, permission, subscription. */

export type PushSupport = 'supported' | 'needs-install' | 'unsupported';

const SW_URL = '/sw.js';

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
}

/** iPhones and iPads only allow web notifications for apps added to the Home Screen. */
export function pushSupport(): PushSupport {
  const capable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (isIos() && !isStandalone()) return 'needs-install';
  return capable ? 'supported' : 'unsupported';
}

export function permission(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'denied';
}

function keyBytes(base64Url: string): Uint8Array {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function toDevice(subscription: PushSubscription): PushDevice {
  const json = subscription.toJSON();
  return { endpoint: json.endpoint ?? subscription.endpoint, keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' } };
}

export async function currentDevice(): Promise<PushDevice | null> {
  if (pushSupport() !== 'supported') return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? toDevice(subscription) : null;
}

/** Asks for permission (if needed) and subscribes this browser. */
export async function subscribe(vapidPublicKey: string): Promise<PushDevice> {
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Notifications are blocked. Allow them for this site in your browser settings, then try again.');
  }
  const registration = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }));
  return toDevice(subscription);
}

export async function unsubscribe(): Promise<string | null> {
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;
  await subscription.unsubscribe();
  return subscription.endpoint;
}

/** Shows a notification right away through the service worker, to check that they appear. */
export async function showTestNotification(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('Ledger', {
    body: 'Reminders are on. You’ll get one at each habit’s reminder time if it isn’t done yet.',
    icon: '/icon-192.png',
    tag: 'ledger-test',
  });
}
