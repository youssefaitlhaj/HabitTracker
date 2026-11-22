import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/ui/Toast';
import { useConnectionToasts } from './useConnectionToasts';

function Shell() {
  useConnectionToasts();
  return null;
}

describe('useConnectionToasts', () => {
  it('says when the connection drops and when it is back', () => {
    render(<ToastProvider><Shell /></ToastProvider>);
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('status')).toHaveTextContent('You’re offline. Changes are kept on this device and sync when you’re back online.');
    act(() => void window.dispatchEvent(new Event('online')));
    expect(screen.getByRole('status')).toHaveTextContent('Back online.');
  });
});
