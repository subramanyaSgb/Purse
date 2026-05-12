import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  CloudOff,
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
import { accountsRepo } from '@/repo/accounts';
import { categoriesRepo } from '@/repo/categories';
import { paymentMethodsRepo } from '@/repo/paymentMethods';
import { placesRepo } from '@/repo/places';
import { subcategoriesRepo } from '@/repo/subcategories';
import { tagsRepo } from '@/repo/tags';

type ManageLink = {
  to: string;
  label: string;
  Icon: LucideIcon;
  count: () => string;
};

function useManageLinks(): ManageLink[] {
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsRepo.list(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesRepo.list(),
  });
  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', 'all'],
    queryFn: () => subcategoriesRepo.list(),
  });
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsRepo.list(),
  });
  const { data: methods = [] } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentMethodsRepo.list(),
  });
  const { data: places = [] } = useQuery({
    queryKey: ['places'],
    queryFn: () => placesRepo.list(),
  });

  return [
    {
      to: '/settings/accounts',
      label: 'Accounts',
      Icon: Wallet,
      count: () => `${accounts.length}`,
    },
    {
      to: '/settings/categories',
      label: 'Categories',
      Icon: FolderTree,
      count: () => `${categories.length} + ${subcategories.length} sub`,
    },
    {
      to: '/settings/tags',
      label: 'Tags',
      Icon: Hash,
      count: () => `${tags.length}`,
    },
    {
      to: '/settings/payment-methods',
      label: 'Payment methods',
      Icon: CreditCard,
      count: () => `${methods.length}`,
    },
    {
      to: '/settings/places',
      label: 'Places',
      Icon: MapPin,
      count: () => `${places.length}`,
    },
  ];
}

export default function SettingsPage() {
  const manageLinks = useManageLinks();

  return (
    <>
      <Header title="Settings" large />
      <div className="flex flex-col gap-4 px-4 pb-8">
        <ProfileCard />

        <SettingsGroup title="Look & feel">
          <ThemeSwitcher />
        </SettingsGroup>

        <SettingsGroup title="Manage data">
          <ul className="bg-card border-border divide-border divide-y rounded-2xl border">
            {manageLinks.map(({ to, label, Icon, count }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="hover:bg-accent focus-visible:ring-ring flex items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="bg-muted text-foreground grid size-8 shrink-0 place-items-center rounded-lg">
                    <Icon className="size-[15px]" aria-hidden />
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{label}</span>
                  <span
                    className="font-mono shrink-0 text-[11px]"
                    style={{ color: 'var(--color-muted-foreground)' }}
                  >
                    {count()}
                  </span>
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

        <SettingsGroup title="Privacy & backup">
          <div className="bg-card border-border rounded-2xl border">
            <div className="border-border flex items-center gap-3 border-b px-4 py-3">
              <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-lg">
                <CloudOff className="size-[15px]" aria-hidden />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">Cloud sync</div>
                <div className="text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>
                  Off · by design
                </div>
              </div>
            </div>
          </div>
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
