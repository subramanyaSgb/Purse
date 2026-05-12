import { NavLink, Outlet } from 'react-router-dom';
import { Home, List, Settings as SettingsIcon, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirstRun } from '@/state/useFirstRun';
import { AddTransactionSheet } from '@/components/forms/AddTransactionSheet';
import { SplashScreen } from '@/components/SplashScreen';
import { TransactionDetailSheet } from '@/components/TransactionDetailSheet';

type Tab = { to: string; label: string; Icon: LucideIcon };

// Labels match the design: "Home / Activity / Accounts / Settings".
const tabs: Tab[] = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/transactions', label: 'Activity', Icon: List },
  { to: '/accounts', label: 'Accounts', Icon: Wallet },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
];

export default function Root() {
  const status = useFirstRun();

  if (status === 'pending') {
    return <SplashScreen />;
  }
  if (status === 'error') {
    return (
      <div className="grid h-full place-items-center p-4 text-center">
        <p className="text-destructive max-w-sm">
          Something went wrong setting up Purse on this device. Try reloading. If the problem
          persists, your browser may be blocking IndexedDB (private mode?).
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>
      {/*
        Concierge tab bar: pill-active style. The icon row sits inside a
        rounded chip that fills with the lime accent on the active tab.
        Border-top is a hairline; the gradient + backdrop blur lift the bar
        slightly off the canvas so content scrolling behind it feels like
        glass on iOS/Android.
      */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-background) 60%, transparent), color-mix(in srgb, var(--color-background) 96%, transparent) 60%)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="grid grid-cols-4 px-3 pt-2 pb-3">
          {tabs.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 flex-col items-center justify-center gap-1 rounded-md text-[10.5px] tracking-wide',
                  isActive ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-7 w-10 items-center justify-center rounded-[13px] transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground bg-transparent',
                    )}
                  >
                    <Icon className="size-[17px]" strokeWidth={isActive ? 2 : 1.8} aria-hidden />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Global Add/Edit transaction sheet mounted once for the whole app —
          opened from any page's FAB via useUiStore.openAddTx(). */}
      <AddTransactionSheet />

      {/* Global Detail sheet — opened when a TransactionRow fires
          useUiStore.setDetailTxId(id). */}
      <TransactionDetailSheet />
    </div>
  );
}
