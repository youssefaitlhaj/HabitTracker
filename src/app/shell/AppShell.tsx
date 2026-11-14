import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { NewHabitButton, useHabitEditor } from '@/features/habits/HabitEditor';
import { useTaskDialogs } from '@/features/tasks/TaskDialogs';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { useRefreshLedger } from '@/state/mutations';
import { useBackend } from '@/state/session';
import { PullToRefresh } from '@/ui/PullToRefresh';
import { useToast } from '@/ui/Toast';
import { useProfile } from '@/state/ledger';
import { Avatar } from '@/ui/Display';
import { cx } from '@/ui/cx';
import { Icon, type IconName } from '@/ui/Icon';
import { LogoMark, Wordmark } from '@/ui/Logo';

/** Responsive navigation (design §8.9): sidebar ≥1200 px, icon rail 768–1199 px, bottom bar on phones. */

interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: IconName;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Today', short: 'Today', icon: 'today', end: true },
  { to: '/tasks', label: 'Tasks', short: 'Tasks', icon: 'tasks' },
  { to: '/habits', label: 'All habits', short: 'Habits', icon: 'list' },
  { to: '/progress', label: 'Progress', short: 'Progress', icon: 'chart' },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: 'settings' },
];

const byPath = (to: string) => NAV.find((n) => n.to === to)!;
/** Phone bar: two items, the + button, two items. Settings is the profile picture on Today. */
const BAR_LEFT = [byPath('/'), byPath('/tasks')];
const BAR_RIGHT = [byPath('/habits'), byPath('/progress')];

type Variant = 'sidebar' | 'rail' | 'bar';

const LINK_STYLE: Record<Variant, { base: string; active: string; idle: string }> = {
  sidebar: {
    base: 'flex min-h-11 items-center gap-3 rounded-[10px] px-3.5 font-medium no-underline',
    active: 'bg-oat-deep font-semibold text-ink [&_svg]:text-whisky',
    idle: 'text-muted hover:bg-oat hover:text-ink',
  },
  rail: {
    base: 'flex min-h-[60px] w-[72px] flex-col items-center justify-center gap-1 rounded-[14px] text-[11px] font-semibold no-underline',
    active: 'bg-oat-deep text-oak',
    idle: 'text-muted hover:bg-oat',
  },
  bar: {
    base: 'flex min-h-[52px] flex-col items-center justify-center gap-[3px] text-[11px] font-semibold no-underline',
    active: 'text-oak',
    idle: 'text-muted',
  },
};

function NavLinks({ variant, items = NAV }: { variant: Variant; items?: NavItem[] }) {
  const style = LINK_STYLE[variant];
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => cx(style.base, isActive ? style.active : style.idle)}
        >
          <Icon name={item.icon} size={variant === 'sidebar' ? 18 : 22} />
          {variant === 'sidebar' ? item.label : item.short}
        </NavLink>
      ))}
    </>
  );
}

function ProfileLink() {
  const { data: profile } = useProfile();
  if (!profile) return null;
  return (
    <NavLink to="/settings" className="mt-auto flex items-center gap-3 rounded-[12px] p-2 text-ink no-underline hover:bg-oat">
      <Avatar url={profile.avatarUrl} name={profile.name || profile.email} size={36} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{profile.name || 'Your profile'}</span>
        <span className="truncate text-xs text-muted">{profile.email}</span>
      </span>
    </NavLink>
  );
}

function DemoNotice() {
  const backend = useBackend();
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('ledger.demoNotice') === 'hidden');
  if (backend.kind !== 'local' || hidden) return null;
  return (
    <div className="flex items-center justify-center gap-3 bg-cask px-4 py-2 text-center text-[13px] text-cask-soft">
      <span>Demo mode: your data stays in this browser. Add Supabase keys to sync across devices.</span>
      <button
        type="button"
        aria-label="Hide demo notice"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-amber hover:bg-white/10"
        onClick={() => {
          sessionStorage.setItem('ledger.demoNotice', 'hidden');
          setHidden(true);
        }}
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

/** The phone + button: choose what to add. */
function CreateChooser({ onClose }: { onClose: () => void }) {
  const habits = useHabitEditor();
  const tasks = useTaskDialogs();
  const pick = (open: () => void) => {
    onClose();
    open();
  };
  return (
    <Dialog open onClose={onClose} title="Add" size="sm">
      <div className="grid grid-cols-2 gap-3 pb-2">
        <Button size="lg" icon="tasks" variant="secondary" onClick={() => pick(() => tasks.edit())}>
          Task
        </Button>
        <Button size="lg" icon="plus" onClick={() => pick(() => habits.open())}>
          Habit
        </Button>
      </div>
    </Dialog>
  );
}

export function AppShell() {
  const [choosing, setChoosing] = useState(false);
  const refresh = useRefreshLedger();
  const toast = useToast();
  const pullToRefresh = async () => {
    if (!(await refresh())) {
      toast.show('Couldn’t refresh. Check your connection and try again.', { kind: 'error', action: { label: 'Retry', run: () => void refresh() } });
    }
  };

  useEffect(() => {
    document.body.classList.add('has-bottom-nav');
    return () => document.body.classList.remove('has-bottom-nav');
  }, []);


  return (
    <PullToRefresh onRefresh={pullToRefresh}>
      <div className="min-h-dvh">
        <DemoNotice />
        <div className="flex">
          <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col gap-7 px-4 py-6 desktop:flex" aria-label="Main">
            <Wordmark size={40} className="px-1" />
            <nav className="flex flex-col gap-1">
              <NavLinks variant="sidebar" />
            </nav>
            <NewHabitButton />
            <ProfileLink />
          </aside>

          <nav className="sticky top-0 hidden h-dvh w-[88px] shrink-0 flex-col items-center gap-2 border-r border-line bg-surface py-6 tablet:flex desktop:hidden" aria-label="Main">
            <span className="mb-4">
              <LogoMark size={48} />
            </span>
            <NavLinks variant="rail" />
          </nav>

          <main className="min-w-0 flex-1 px-4 pb-32 pt-6 tablet:px-6 tablet:pb-16 desktop:px-8">
            <div className="mx-auto max-w-[1180px]">
              <Outlet />
            </div>
          </main>
        </div>

        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-center border-t border-line bg-surface px-2 pt-1.5 pb-[calc(10px+env(safe-area-inset-bottom))] tablet:hidden"
        >
          <NavLinks variant="bar" items={BAR_LEFT} />
          <span className="flex justify-center">
            <button
              type="button"
              aria-label="Add a habit or task"
              onClick={() => setChoosing(true)}
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-whisky text-on-accent shadow-fab"
            >
              <Icon name="plus" size={24} strokeWidth={2.5} />
            </button>
          </span>
          <NavLinks variant="bar" items={BAR_RIGHT} />
        </nav>
        {choosing && <CreateChooser onClose={() => setChoosing(false)} />}
      </div>
    </PullToRefresh>
  );
}
