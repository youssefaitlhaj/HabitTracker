import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cx } from './cx';
import { Icon } from './Icon';

/**
 * Modal dialog: centred on tablet/desktop, bottom sheet on phones (design §8.8).
 * Traps focus, closes on Esc or backdrop click, and returns focus to the trigger.
 */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
  role?: 'dialog' | 'alertdialog';
  describedBy?: string;
}

export function Dialog({ open, onClose, title, children, footer, size = 'md', role = 'dialog', describedBy }: DialogProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const node = panel.current;
    (node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      trigger?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(42,26,15,0.42)] backdrop-blur-[3px] tablet:items-center tablet:p-4">
      <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        className={cx(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-dialog',
          'animate-sheet-in rounded-t-[26px] tablet:animate-pop-in tablet:rounded-dialog',
          size === 'sm' ? 'tablet:max-w-[440px]' : 'tablet:max-w-[600px]',
        )}
      >
        <span className="mx-auto mt-2.5 h-[5px] w-10 shrink-0 rounded-full bg-line-strong tablet:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-4 tablet:pt-5">
          <h2 id={titleId} className="font-display text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-field bg-oat text-ink hover:bg-oat-deep"
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 pt-2">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line-soft px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 tablet:pb-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  /** A safer alternative, e.g. "Archive instead". */
  alternative?: { label: string; run: () => void };
  busy?: boolean;
}

/** Destructive confirmation; always offers Cancel and optionally a safer option. */
export function ConfirmDialog({ open, onClose, title, message, confirmLabel, onConfirm, alternative, busy }: ConfirmDialogProps) {
  const messageId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      role="alertdialog"
      describedBy={messageId}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} data-autofocus>
            Cancel
          </Button>
          {alternative && (
            <Button variant="secondary" onClick={alternative.run}>
              {alternative.label}
            </Button>
          )}
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-error-soft text-error">
          <Icon name="warning" size={22} />
        </span>
        <p id={messageId} className="m-0 text-[15px] leading-relaxed text-muted">
          {message}
        </p>
      </div>
    </Dialog>
  );
}
