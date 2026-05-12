import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, List, Wallet, Settings as SettingsIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirstRun } from '@/state/useFirstRun';

type Tab = { to: string; label: string; Icon: LucideIcon };

const tabs: Tab[] = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', Icon: List },
  { to: '/accounts', label: 'Accounts', Icon: Wallet },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
];

function CenteredSpinner({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid h-full place-items-center">
      <div className="border-muted border-t-primary h-10 w-10 animate-spin rounded-full border-4" />
    </div>
  );
}

export default function Root() {
  const status = useFirstRun();

  if (status === 'pending') {
    return <CenteredSpinner label="Setting up Purse" />;
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
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav
        aria-label="Primary"
        className="bg-background fixed inset-x-0 bottom-0 grid h-16 grid-cols-4 border-t pb-[env(safe-area-inset-bottom)]"
      >
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-xs',
                isActive ? 'text-primary font-medium' : 'text-muted-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={cn(
                    'bg-primary absolute inset-x-4 top-0 h-0.5 rounded-full transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon className="size-5" aria-hidden />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
