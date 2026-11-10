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

const STRENGTH_COLOR = ['#A1311F', '#A1311F', '#8A5A00', '#4E6B2A', '#4E6B2A'];

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
              <span key={i} className={cx('h-1 rounded-sm')} style={{ background: i < strength.score ? STRENGTH_COLOR[strength.score] : '#E2D7C4' }} />
            ))}
          </div>
          <span className="min-w-[64px] text-right text-xs font-semibold" style={{ color: STRENGTH_COLOR[strength.score] }}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}
