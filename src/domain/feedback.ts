/**
 * Feedback from demo visitors, sent when they leave the demo (/demo). Anonymous by design:
 * only the text and the server's timestamp are kept. Admins read it in Settings › Demo feedback.
 */

export const FEEDBACK_MAX = 1000;

export interface DemoFeedback {
  id: string;
  text: string;
  /** When it was sent, ISO 8601, from the server's clock. */
  createdAt: string;
}

export function feedbackError(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return 'Write a few words first, or exit without feedback.';
  if (trimmed.length > FEEDBACK_MAX) return `Keep it under ${FEEDBACK_MAX} characters.`;
  return undefined;
}

const PREVIEW_CHARS = 120;
const preview = (text: string) => (text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS - 1).trimEnd()}…` : text);

/** The admins' push notification for new feedback; `texts` newest first. */
export function feedbackMessage(texts: string[]): { title: string; body: string } {
  const latest = preview(texts[0] ?? '');
  return {
    title: texts.length === 1 ? 'New demo feedback' : `${texts.length} new demo feedback messages`,
    body: texts.length === 1 ? `“${latest}”` : `Latest: “${latest}”`,
  };
}
