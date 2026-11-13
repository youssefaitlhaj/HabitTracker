import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

const VARIANTS = {
  primary: 'bg-whisky text-on-accent hover:bg-oak border-transparent',
  secondary: 'bg-field text-ink border-line-strong hover:bg-surface',
  ghost: 'bg-transparent text-whisky border-transparent hover:bg-oat',
  quiet: 'bg-transparent text-muted border-transparent hover:bg-oat',
  dark: 'bg-cask text-on-cask border-transparent hover:opacity-90',
  danger: 'bg-error text-on-accent border-transparent hover:opacity-90',
  'danger-outline': 'bg-transparent text-error border-error-line hover:bg-error-soft',
} as const;

const SIZES = {
  lg: 'min-h-[52px] rounded-[14px] px-6 text-base',
  md: 'min-h-12 rounded-field px-5 text-[15px]',
  sm: 'min-h-11 rounded-field px-4 text-sm',
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  icon?: IconName;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 border-[1.5px] font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-[2.5px] border-current border-t-transparent" aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} />
      )}
      {children}
    </button>
  );
});

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  label: string;
  tone?: 'plain' | 'oat' | 'primary';
}

const ICON_TONES = {
  plain: 'bg-transparent text-muted hover:bg-oat',
  oat: 'bg-oat text-ink hover:bg-oat-deep',
  primary: 'bg-whisky text-on-accent hover:bg-oak',
} as const;

export function IconButton({ icon, label, tone = 'plain', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-field transition-colors disabled:opacity-40',
        ICON_TONES[tone],
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
