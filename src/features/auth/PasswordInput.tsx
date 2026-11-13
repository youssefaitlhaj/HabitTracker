import { useState } from 'react';
import { passwordStrength } from '@/domain/validation';
import { cx } from '@/ui/cx';
import { TextInput } from '@/ui/Field';
import { Icon } from '@/ui/Icon';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  autoComplete: 'current-password' | 'new-password';
  showStrength?: boolean;
}

const STRENGTH_TONE = ['error', 'error', 'warning', 'success', 'success'] as const;
const BAR = { error: 'bg-error', warning: 'bg-warning', success: 'bg-success' } as const;
const TEXT = { error: 'text-error', warning: 'text-warning', success: 'text-success' } as const;

/** Password field with show/hide and an optional strength bar. */
export function PasswordInput({ id, value, onChange, invalid, describedBy, autoComplete, showStrength }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <TextInput
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder="At least 8 characters"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          invalid={invalid}
          aria-describedby={describedBy}
          className="pr-14"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:text-ink"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} />
        </button>
      </div>
      {showStrength && value && (
        <div className="flex items-center gap-2.5">
          <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cx('h-1 rounded-sm', i < strength.score ? BAR[STRENGTH_TONE[strength.score]] : 'bg-line')} />
            ))}
          </div>
          <span className={cx('min-w-[64px] text-right text-xs font-semibold', TEXT[STRENGTH_TONE[strength.score]])}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}
