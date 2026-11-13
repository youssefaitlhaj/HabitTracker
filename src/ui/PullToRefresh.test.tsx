import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PullToRefresh } from './PullToRefresh';

function pull(distance: number) {
  fireEvent.touchStart(window, { touches: [{ clientY: 10 }] });
  fireEvent.touchMove(window, { touches: [{ clientY: 10 + distance }] });
  fireEvent.touchEnd(window);
}

describe('PullToRefresh', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.style.overflow = '';
  });

  it('refreshes after a long enough pull and shows a spinner meanwhile', async () => {
    let finish!: () => void;
    const onRefresh = vi.fn(() => new Promise<void>((r) => (finish = r)));
    render(<PullToRefresh onRefresh={onRefresh}><p>page</p></PullToRefresh>);

    await act(async () => pull(200));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(screen.getByText('Refreshing')).toBeInTheDocument();

    await act(async () => {
      finish();
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(screen.queryByText('Refreshing')).not.toBeInTheDocument();
  });

  it('ignores short pulls and pulls while a dialog is open', async () => {
    const onRefresh = vi.fn(() => Promise.resolve());
    render(<PullToRefresh onRefresh={onRefresh}><p>page</p></PullToRefresh>);
    await act(async () => pull(60));
    document.body.style.overflow = 'hidden';
    await act(async () => pull(300));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('turns off the browser’s own pull-to-refresh while mounted', () => {
    const { unmount } = render(<PullToRefresh onRefresh={() => Promise.resolve()}><p>page</p></PullToRefresh>);
    expect(document.documentElement.style.overscrollBehaviorY).toBe('contain');
    unmount();
    expect(document.documentElement.style.overscrollBehaviorY).toBe('');
  });
});
