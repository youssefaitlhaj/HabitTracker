import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

/** Shared look for every text-like control (inputs, selects, date triggers). */
export function fieldClass(invalid = false, extra?: string): string {
  return cx(
    'w-full rounded-field border-[1.5px] bg-field px-3.5 text-[15px] text-ink transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    invalid ? 'border-error' : 'border-line-strong hover:border-muted',
    extra,
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <span id={id} className="flex items-center gap-1.5 text-[13px] text-error">
      <Icon name="alert" size={14} strokeWidth={2.5} />
      {children}
    </span>
  );
}

interface FieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: (control: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, error, hint, aside, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {aside}
      </div>
      {children({ id, describedBy: error || hint ? messageId : undefined, invalid: !!error })}
      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : (
        hint && (
          <span id={messageId} className="text-[13px] text-muted">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const TextInput = forwardRef<HTMLInputElement, InputProps>(function TextInput({ invalid, className, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={fieldClass(invalid, cx('h-12', className))} {...rest} />;
});

export function TextArea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={fieldClass(invalid, cx('resize-y py-3', className))} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={fieldClass(false, cx('h-12 px-3', className))} {...rest}>
      {children}
    </select>
  );
}
