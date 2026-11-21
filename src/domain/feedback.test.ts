import { describe, expect, it } from 'vitest';
import { FEEDBACK_MAX, feedbackError, feedbackMessage } from './feedback';

describe('demo feedback', () => {
  it('needs some text, within the limit', () => {
    expect(feedbackError('   ')).toBeDefined();
    expect(feedbackError('x'.repeat(FEEDBACK_MAX + 1))).toBeDefined();
    expect(feedbackError(' Nice charts ')).toBeUndefined();
  });

  it('tells admins about one message, or how many and the latest', () => {
    expect(feedbackMessage(['Nice charts'])).toEqual({ title: 'New demo feedback', body: '“Nice charts”' });
    expect(feedbackMessage(['Newest', 'Older'])).toEqual({ title: '2 new demo feedback messages', body: 'Latest: “Newest”' });
    expect(feedbackMessage(['x'.repeat(300)]).body.length).toBeLessThan(130);
  });
});
