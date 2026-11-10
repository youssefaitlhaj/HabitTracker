import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

function Trigger({ message = 'Saved.', undo }: { message?: string; undo?: () => void }) {
  const toast = useToast();
  return (
    <button onClick={() => toast.show(message, { kind: 'success', action: undo && { label: 'Undo', run: undo } })}>show</button>
  );
}

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('disappears after 5 seconds', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText('show'));
    expect(screen.getByRole('status')).toHaveTextContent('Saved.');
    act(() => vi.advanceTimersByTime(4900));
    expect(screen.queryByRole('status')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('pauses while hovered', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText('show'));
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.mouseEnter(screen.getByRole('status'));
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByRole('status'));
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('runs the action and closes', () => {
    const undo = vi.fn();
    render(<ToastProvider><Trigger undo={undo} /></ToastProvider>);
    fireEvent.click(screen.getByText('show'));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalledOnce();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows one toast at a time and restarts the timer for a new one', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText('show'));
    act(() => vi.advanceTimersByTime(4000));
    fireEvent.click(screen.getByText('show'));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
