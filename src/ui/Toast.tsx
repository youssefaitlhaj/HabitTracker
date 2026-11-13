import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TOAST_DURATION_MS } from '@/app/config';
import { FEEDBACK, type FeedbackKind } from './feedback';
import { Icon } from './Icon';

/**
 * Toasts (design §8.8): one at a time, bottom center, gone after 5 s.
 * Hovering or focusing pauses the timer so nobody is rushed.
 */

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastOptions {
  kind?: FeedbackKind;
  action?: ToastAction;
}

interface ToastState extends Required<Pick<ToastOptions, 'kind'>> {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastApi {
  show: (message: string, options?: ToastOptions) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

export function ToastProvider({ children, duration = TOAST_DURATION_MS }: { children: ReactNode; duration?: number }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const seq = useRef(0);

  const dismiss = useCallback(() => setToast(null), []);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      seq.current += 1;
      remaining.current = duration;
      setPaused(false);
      setToast({ id: seq.current, message, kind: options.kind ?? 'info', action: options.action });
    },
    [duration],
  );

  useEffect(() => {
    if (!toast || paused) return;
    const id = toast.id;
    startedAt.current = Date.now();
    const timer = window.setTimeout(dismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      // Only bank the elapsed time when this same toast is being paused, not replaced.
      if (seq.current === id) remaining.current -= Date.now() - startedAt.current;
    };
  }, [toast, paused, dismiss]);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast &&
        createPortal(
          <ToastView
            key={toast.id}
            toast={toast}
            duration={duration}
            paused={paused}
            onPause={setPaused}
            onDismiss={dismiss}
          />,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

interface ToastViewProps {
  toast: ToastState;
  duration: number;
  paused: boolean;
  onPause: (paused: boolean) => void;
  onDismiss: () => void;
}

function ToastView({ toast, duration, paused, onPause, onDismiss }: ToastViewProps) {
  const style = FEEDBACK[toast.kind];
  return (
    <div
      role={style.role}
      aria-live={style.role === 'alert' ? 'assertive' : 'polite'}
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocus={() => onPause(true)}
      onBlur={() => onPause(false)}
      className="fixed left-1/2 z-[60] w-max max-w-[calc(100vw-32px)] -translate-x-1/2 animate-toast-in overflow-hidden rounded-2xl bg-toast text-on-cask shadow-toast"
      style={{ bottom: 'calc(var(--toast-offset) + env(safe-area-inset-bottom))' }}
    >
      <div className="flex min-h-14 items-center gap-3 py-2 pl-3 pr-2">
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: style.toast.tint, color: style.toast.color }}
        >
          <Icon name={style.icon} size={16} strokeWidth={2.75} />
        </span>
        <span className="min-w-0 flex-1 text-sm leading-snug">{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.run();
              onDismiss();
            }}
            className="min-h-10 rounded-[10px] bg-[rgba(240,180,106,0.12)] px-3 text-sm font-semibold text-[#F0B46A]"
          >
            {toast.action.label}
          </button>
        )}
        <button
          type="button"
          aria-label="Dismiss message"
          onClick={onDismiss}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-on-cask-muted hover:bg-white/5"
        >
          <Icon name="x" size={16} strokeWidth={2.5} />
        </button>
      </div>
      <div className="h-[3px] bg-white/10">
        <div
          className="h-full origin-left"
          style={{
            background: style.toast.color,
            animation: `toast-bar ${duration}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
}
