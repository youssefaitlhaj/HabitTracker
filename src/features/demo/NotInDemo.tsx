import type { ReactNode } from 'react';

/** Label for features that need a real account (shown in the sample-data demo). */
export function NotInDemoTag() {
  return <span className="inline-flex shrink-0 items-center rounded-full bg-oat px-2.5 py-0.5 text-xs font-semibold text-muted">Not in the demo</span>;
}

/** Shows its controls, but greyed out and unusable, when `locked`. */
export function DemoLock({ locked, children }: { locked: boolean; children: ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <fieldset disabled className="m-0 min-w-0 border-0 p-0 opacity-60">
      {children}
    </fieldset>
  );
}
