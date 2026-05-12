import { useEffect, useState } from 'react';
import { appMetaRepo } from '@/repo/appMeta';
import { seedIfEmpty } from '@/seed/seed';
import { useUiStore } from './uiStore';

export type FirstRunStatus = 'pending' | 'ready' | 'error';

/**
 * Runs once at app mount:
 * 1. Look up the appMeta singleton.
 * 2. If absent, run seedIfEmpty() to populate defaults; seedIfEmpty
 *    is idempotent (already short-circuits on appMeta presence), so a
 *    parallel mount in StrictMode is safe.
 * 3. Hydrate the UI store's theme from the persisted appMeta value.
 *
 * Returns 'pending' until step 3 completes, then 'ready' (or 'error').
 * The Root layout uses this to render a centred spinner during seed.
 */
export function useFirstRun(): FirstRunStatus {
  const [status, setStatus] = useState<FirstRunStatus>('pending');
  const setTheme = useUiStore((s) => s.setTheme);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let meta = await appMetaRepo.get();
        if (!meta) {
          await seedIfEmpty();
          meta = await appMetaRepo.get();
        }
        if (cancelled) return;
        if (meta) setTheme(meta.theme);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        // Log once; the UI surfaces a generic error state via FirstRunStatus.
        // (Phase 6 will replace this with a proper error boundary + toast.)
        console.error('useFirstRun failed:', e);
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  return status;
}
