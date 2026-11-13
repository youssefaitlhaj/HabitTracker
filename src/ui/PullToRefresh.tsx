import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

/**
 * Pull-to-refresh for touch screens: pull down at the top of the page, release past the
 * threshold, and `onRefresh` runs while a spinner shows. The browser's own pull-to-refresh
 * (a full reload) is disabled while this is mounted.
 */

const THRESHOLD = 72;
const MAX_PULL = 110;
const RESISTANCE = 0.5;
/** Keep the spinner up long enough to be seen, even when the refresh is instant. */
const MIN_SPIN_MS = 600;

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
}

/** No pulling while a dialog has locked the page, or when the page isn't at the very top. */
const canStartPull = () => window.scrollY <= 0 && document.body.style.overflow !== 'hidden';

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busy = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = 'contain';

    const setPullBoth = (value: number) => {
      pullRef.current = value;
      setPull(value);
    };
    const onStart = (e: TouchEvent) => {
      startY.current = !busy.current && e.touches.length === 1 && canStartPull() ? e.touches[0]!.clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const distance = (e.touches[0]!.clientY - startY.current) * RESISTANCE;
      setPullBoth(distance > 0 && window.scrollY <= 0 ? Math.min(MAX_PULL, distance) : 0);
    };
    const onEnd = async () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current < THRESHOLD) return setPullBoth(0);
      busy.current = true;
      setRefreshing(true);
      setPullBoth(THRESHOLD);
      await Promise.all([onRefreshRef.current().catch(() => undefined), new Promise((r) => setTimeout(r, MIN_SPIN_MS))]);
      busy.current = false;
      setRefreshing(false);
      setPullBoth(0);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      root.style.overscrollBehaviorY = previous;
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  const progress = Math.min(1, pull / THRESHOLD);
  const visible = pull > 0 || refreshing;

  return (
    <>
      <span aria-live="polite" className="sr-only">
        {refreshing ? 'Refreshing' : ''}
      </span>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center"
        style={{
          transform: `translateY(${pull - 48}px)`,
          opacity: visible ? 1 : 0,
          transition: startY.current === null ? 'transform 200ms ease, opacity 200ms ease' : 'none',
        }}
      >
        <span className="mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-whisky shadow-pop">
          {refreshing ? (
            <Spinner size={18} />
          ) : (
            <span style={{ transform: `rotate(${progress * 180}deg)`, opacity: 0.4 + progress * 0.6 }} className="flex">
              <Icon name="arrowDown" size={18} strokeWidth={2.5} />
            </span>
          )}
        </span>
      </div>
      {children}
    </>
  );
}
