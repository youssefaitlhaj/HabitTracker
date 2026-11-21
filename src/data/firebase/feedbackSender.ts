import type { FeedbackSender } from '../ports';
import type { FirebaseSettings } from './firebaseBackend';

/**
 * Sends demo feedback to Firestore (demoFeedback/{id}) without signing in. Only the text is
 * sent; `createdAt` is the server's time and `notified` tells the reminder job to alert admins.
 * The Firebase SDK is loaded on the first send, so the demo itself stays small.
 */

export const FEEDBACK_COLLECTION = 'demoFeedback';
const APP_NAME = 'ledger-feedback';

export function createFeedbackSender(settings: FirebaseSettings): FeedbackSender {
  return {
    async send(text: string): Promise<void> {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('You’re offline. Connect to the internet to send feedback, or exit without it.');
      }
      const [{ getApps, initializeApp }, { addDoc, collection, getFirestore, serverTimestamp }, { friendly }] = await Promise.all([
        import('firebase/app'),
        import('firebase/firestore'),
        import('./errors'),
      ]);
      const app = getApps().find((a) => a.name === APP_NAME) ?? initializeApp(settings, APP_NAME);
      await friendly(addDoc(collection(getFirestore(app), FEEDBACK_COLLECTION), { text: text.trim(), createdAt: serverTimestamp(), notified: false }));
    },
  };
}
