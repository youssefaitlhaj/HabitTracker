/** The one service worker (public/sw.js): offline app files and reminder notifications. */
export const SW_URL = '/sw.js';

/** Registers it on start-up so the installed app keeps working offline. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_URL).catch((error) => console.error('[Ledger] Offline support unavailable:', error));
  });
}
