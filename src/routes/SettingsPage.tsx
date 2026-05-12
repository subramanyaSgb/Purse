import { Link } from 'react-router-dom';
import {
  ChevronRight,
  CreditCard,
  FolderTree,
  Hash,
  MapPin,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { BackupSection } from '@/components/BackupSection';
import { ProfileCard } from '@/components/ProfileCard';
import { ProfileSection } from '@/components/ProfileSection';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

type ManageLink = {
  to: string;
  label: string;
  Icon: LucideIcon;
};

const manageLinks: ManageLink[] = [
  { to: '/settings/accounts', label: 'Accounts', Icon: Wallet },
  { to: '/settings/categories', label: 'Categories', Icon: FolderTree },
  { to: '/settings/tags', label: 'Tags', Icon: Hash },
  { to: '/settings/payment-methods', label: 'Payment methods', Icon: CreditCard },
  { to: '/settings/places', label: 'Places', Icon: MapPin },
];

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" large />
      <div className="flex flex-col gap-4 px-4 pb-8">
        <ProfileCard />

        <SettingsGroup title="Manage data">
          <ul className="bg-card border-border divide-border divide-y rounded-2xl border">
            {manageLinks.map(({ to, label, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="hover:bg-accent focus-visible:ring-ring flex items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="bg-muted text-foreground grid size-8 shrink-0 place-items-center rounded-lg">
                    <Icon className="size-[15px]" aria-hidden />
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{label}</span>
                  <ChevronRight
                    className="size-4 shrink-0"
                    style={{ color: 'var(--color-ink-faint)' }}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </SettingsGroup>

        <SettingsGroup title="Profile details">
          <ProfileSection />
        </SettingsGroup>

        <SettingsGroup title="Look & feel">
          <ThemeSwitcher />
        </SettingsGroup>

        <SettingsGroup title="Privacy & backup">
          <BackupSection />
        </SettingsGroup>

        <p
          className="font-display border-border mt-2 rounded-2xl border border-dashed py-4 text-center text-[13px]"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          "Built on a Sunday in Bengaluru."
          <span className="font-sans mt-1 block text-[11px] font-normal">
            All your money data stays on this device. Always.
          </span>
        </p>
      </div>
    </>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2
        className="px-1 text-[11px] font-semibold tracking-wider uppercase"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
