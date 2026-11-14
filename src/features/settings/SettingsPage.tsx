import { type ReactNode } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { LedgerView } from '@/app/shell/LedgerView';
import type { Ledger } from '@/state/ledger';
import { cx } from '@/ui/cx';
import { PageHeader } from '@/ui/Display';
import { Icon, type IconName } from '@/ui/Icon';
import { AccountTab } from './AccountTab';
import { DataTab } from './DataTab';
import { NotificationsTab } from './NotificationsTab';
import { PreferencesTab } from './PreferencesTab';
import { ProfileTab } from './ProfileTab';

/** Settings (design §8.5). Language is hidden for now. */

const TABS: { id: string; label: string; icon: IconName; render: (ledger: Ledger) => ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: 'user', render: (l) => <ProfileTab ledger={l} /> },
  { id: 'preferences', label: 'Preferences', icon: 'settings', render: (l) => <PreferencesTab ledger={l} /> },
  { id: 'notifications', label: 'Notifications', icon: 'bell', render: () => <NotificationsTab /> },
  { id: 'data', label: 'Data', icon: 'download', render: (l) => <DataTab ledger={l} /> },
  { id: 'account', label: 'Account', icon: 'logout', render: () => <AccountTab /> },
];

export function SettingsPage() {
  const { tab = 'profile' } = useParams();
  const current = TABS.find((t) => t.id === tab);
  if (!current) return <Navigate to="/settings" replace />;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Settings" />
      <div className="flex flex-wrap items-start gap-7">
        <nav aria-label="Settings sections" className="flex flex-[1_1_200px] flex-wrap gap-1 desktop:max-w-[220px] desktop:flex-col">
          {TABS.map((t) => (
            <NavLink
              key={t.id}
              to={t.id === 'profile' ? '/settings' : `/settings/${t.id}`}
              end
              className={({ isActive }) =>
                cx(
                  'flex min-h-12 flex-1 items-center gap-3 rounded-field px-3.5 text-[15px] font-semibold no-underline desktop:flex-none',
                  isActive || (t.id === 'profile' && tab === 'profile') ? 'bg-ink text-paper' : 'text-muted hover:bg-oat',
                )
              }
            >
              <Icon name={t.icon} />
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <LedgerView>{(ledger) => current.render(ledger)}</LedgerView>
        </div>
      </div>
    </div>
  );
}

/** Card wrapper + label/hint/control row shared by all settings tabs. */
export function SettingsCard({ title, description, children, tone = 'plain', titleId }: { title: string; description?: ReactNode; children: ReactNode; tone?: 'plain' | 'danger'; titleId?: string }) {
  return (
    <section
      aria-labelledby={titleId}
      className={cx('flex flex-col gap-4 rounded-card p-5 tablet:p-6', tone === 'danger' ? 'border-[1.5px] border-error-line bg-error-soft/40' : 'card')}
    >
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className={cx('m-0 font-display text-[22px] font-semibold', tone === 'danger' && 'text-error-ink')}>
          {title}
        </h2>
        {description && <p className="m-0 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function SettingsRow({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
