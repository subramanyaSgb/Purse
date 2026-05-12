import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';

/**
 * Service-worker update + offline-ready toasts.
 *
 * - When a new service worker is waiting for activation, surface a
 *   'Refresh to update' chip in the bottom-right corner above the FAB
 *   inset. Tap → calls updateSW() which calls postMessage SKIP_WAITING
 *   and reloads.
 * - When the SW completes the first install (offline cache ready), show
 *   a one-time 'Available offline' confirmation that auto-dismisses
 *   after 4 seconds.
 *
 * vite-plugin-pwa exposes useRegisterSW from the virtual:pwa-register
 * entry point; no separate dep needed.
 */
export function PwaUpdateToast() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, _r) {
      // Could check for updates periodically here; vite-plugin-pwa's
      // autoUpdate flow already handles this for us on visibilitychange.
    },
    onRegisterError(error) {
      // SW registration failing is non-fatal — the app still runs without
      // offline support.
      console.error('SW registration failed:', error);
    },
  });

  // Auto-dismiss 'available offline' after 4s.
  useEffect(() => {
    if (!offlineReady) return;
    const id = setTimeout(() => setOfflineReady(false), 4000);
    return () => clearTimeout(id);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4"
    >
      {needRefresh ? (
        <div className="bg-card border-border pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg">
          <span className="bg-primary size-2 shrink-0 animate-pulse rounded-full" aria-hidden />
          <span className="text-foreground text-sm font-medium">Update ready</span>
          <Button
            type="button"
            size="sm"
            onClick={() => updateServiceWorker(true)}
            className="ml-1 h-7 rounded-full px-3 text-xs"
          >
            Refresh
          </Button>
        </div>
      ) : (
        <div className="bg-card border-border pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: 'var(--color-income)' }}
          />
          <span className="text-foreground text-sm font-medium">Available offline</span>
        </div>
      )}
    </div>
  );
}

/**
 * 'Install Purse' chip — fired when the browser dispatches
 * beforeinstallprompt. Shows once; dismissing it sets a localStorage flag
 * so we don't nag the user.
 *
 * Mount alongside PwaUpdateToast in Root.tsx.
 */
const DISMISSED_KEY = 'purse.install.dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(DISMISSED_KEY) === '1';
  });

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (!event || dismissed) return null;

  async function handleInstall() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    setEvent(null);
    if (outcome === 'dismissed') {
      localStorage.setItem(DISMISSED_KEY, '1');
      setDismissed(true);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
    setEvent(null);
  }

  return (
    <div
      role="dialog"
      aria-label="Install Purse"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4"
    >
      <div className="bg-card border-border pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg">
        <span
          aria-hidden
          className="bg-primary text-primary-foreground font-display grid size-7 place-items-center rounded-full text-[11px] font-bold"
        >
          P
        </span>
        <span className="text-foreground text-sm font-medium">Install Purse</span>
        <Button
          type="button"
          size="sm"
          onClick={handleInstall}
          className="ml-1 h-7 rounded-full px-3 text-xs"
        >
          Install
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="text-muted-foreground hover:text-foreground ml-1 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
