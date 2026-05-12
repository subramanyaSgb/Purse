import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFirstRun } from '@/state/useFirstRun';

const tabs = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/settings', label: 'Settings' },
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
      <nav className="fixed inset-x-0 bottom-0 grid h-16 grid-cols-4 border-t bg-background">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center text-sm',
                isActive ? 'text-primary font-medium' : 'text-muted-foreground',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
