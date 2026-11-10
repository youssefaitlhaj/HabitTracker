import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { cx } from '@/ui/cx';
import { Wordmark } from '@/ui/Logo';

/** Split layout for every signed-out screen: brand panel + form (design: Auth.dc.html). */

const DECO_SHADES = ['#4A2F1C', '#6A4126', '#9A5A28', '#C9813A', '#E8B67A'];

/** Decorative heatmap; deterministic so it looks the same on every visit. */
const DECO = Array.from({ length: 22 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => DECO_SHADES[Math.min(4, Math.floor(((Math.sin(w * 7.1 + d * 3.3) + 1) / 2 + w / 40) * 3))]!),
);

export function AuthLayout({ title, subtitle, children, tabs = false }: { title: string; subtitle: string; children: ReactNode; tabs?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-wrap">
      <section className="flex flex-[1_1_420px] flex-col justify-between gap-10 bg-cask px-6 py-10 text-paper tablet:px-14" aria-label="About Ledger">
        <Link to="/login" className="self-start no-underline">
          <Wordmark tone="dark" size={48} />
        </Link>
        <div className="flex max-w-[460px] flex-col gap-5">
          <h1 className="m-0 font-display text-[clamp(36px,4.4vw,56px)] font-normal leading-[1.02] tracking-tight">
            Small habits.
            <br />A year that fills in.
          </h1>
          <p className="m-0 text-base leading-relaxed text-cask-soft">
            Check things off in a tap, keep your streaks honest with rest days, and take your data with you whenever you want.
          </p>
        </div>
        <div className="flex gap-1 overflow-hidden" aria-hidden="true">
          {DECO.map((week, i) => (
            <div key={i} className="flex flex-col gap-1">
              {week.map((c, j) => (
                <span key={j} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <main className="flex flex-[1_1_480px] items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-[400px] flex-col gap-6">
          {tabs && (
            <nav className="flex rounded-field bg-oat p-1" aria-label="Log in or sign up">
              {[
                { to: '/login', label: 'Log in' },
                { to: '/signup', label: 'Sign up' },
              ].map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) =>
                    cx('flex min-h-11 flex-1 items-center justify-center rounded-[9px] text-sm font-semibold no-underline', isActive ? 'bg-surface text-oak shadow-lift' : 'text-muted')
                  }
                >
                  {t.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 font-display text-[30px] font-semibold tracking-tight">{title}</h2>
            <p className="m-0 text-[15px] text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
