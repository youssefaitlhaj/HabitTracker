import type { IconName } from './Icon';

/** The four message kinds, shared by toasts and banners so they always match (design §8.8). */
export type FeedbackKind = 'info' | 'success' | 'warning' | 'error';

interface KindStyle {
  icon: IconName;
  /** Screen-reader role: urgent kinds interrupt. */
  role: 'status' | 'alert';
  toast: { color: string; tint: string };
  banner: { surface: string; badge: string };
}

export const FEEDBACK: Record<FeedbackKind, KindStyle> = {
  info: {
    icon: 'info',
    role: 'status',
    toast: { color: '#E8B67A', tint: 'rgba(232, 182, 122, 0.16)' },
    banner: { surface: 'bg-oat text-ink border border-line', badge: 'bg-cask text-amber' },
  },
  success: {
    icon: 'check',
    role: 'status',
    toast: { color: '#A8C98A', tint: 'rgba(168, 201, 138, 0.16)' },
    banner: { surface: 'bg-success-soft text-success-ink', badge: 'bg-success text-surface' },
  },
  warning: {
    icon: 'warning',
    role: 'alert',
    toast: { color: '#F0C46A', tint: 'rgba(240, 196, 106, 0.16)' },
    banner: { surface: 'bg-warning-soft text-warning-ink', badge: 'bg-warning text-surface' },
  },
  error: {
    icon: 'x',
    role: 'alert',
    toast: { color: '#F29A88', tint: 'rgba(242, 154, 136, 0.16)' },
    banner: { surface: 'bg-error-soft text-error-ink', badge: 'bg-error text-surface' },
  },
};
