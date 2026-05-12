import { useEffect } from 'react';
import { useUiStore } from './uiStore';
import type { Theme } from '@/domain/types';

const DARK = 'dark';

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const wantDark = theme === DARK || (theme === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle(DARK, wantDark);
}

/**
 * Mount-only component that drives the `.dark` class on <html> from the
 * UI store's `theme` field. When the theme is `'system'`, also listens
 * to `(prefers-color-scheme: dark)` changes so the user's OS toggle
 * takes effect live.
 *
 * Renders nothing.
 */
export function ThemeProvider({ children }: { children?: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return <>{children}</>;
}
