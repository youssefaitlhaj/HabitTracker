import type { ReactNode } from 'react';
import { cx } from './cx';
import { FEEDBACK, type FeedbackKind } from './feedback';
import { Icon } from './Icon';

interface BannerProps {
  kind?: FeedbackKind;
  title: ReactNode;
  children?: ReactNode;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
}

/** In-page message that stays until dismissed (design §8.8). */
export function Banner({ kind = 'info', title, children, onDismiss, action, className }: BannerProps) {
  const style = FEEDBACK[kind];
  return (
    <div role={style.role} className={cx('flex items-start gap-3 rounded-2xl p-3.5 pl-4', style.banner.surface, className)}>
      <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', style.banner.badge)}>
        <Icon name={style.icon} size={15} strokeWidth={2.75} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        {children && <span className="text-sm leading-snug opacity-90">{children}</span>}
        {action && <div className="pt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] opacity-70 hover:opacity-100"
        >
          <Icon name="x" size={16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
