import { Link } from 'react-router-dom';
import { ChevronRight, CreditCard, FolderTree, Hash, MapPin, Wallet } from 'lucide-react';
import { Header } from '@/components/Header';
import { BackupSection } from '@/components/BackupSection';
import { ProfileSection } from '@/components/ProfileSection';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

type SettingsLink = {
  to: string;
  label: string;
  description: string;
  Icon: typeof Wallet;
};

const manageLinks: SettingsLink[] = [
  {
    to: '/settings/accounts',
    label: 'Accounts',
    description: 'Cash, bank, credit cards',
    Icon: Wallet,
  },
  {
    to: '/settings/categories',
    label: 'Categories',
    description: 'Expense and income buckets',
    Icon: FolderTree,
  },
  {
    to: '/settings/tags',
    label: 'Tags',
    description: 'Cross-cutting labels',
    Icon: Hash,
  },
  {
    to: '/settings/payment-methods',
    label: 'Payment methods',
    description: 'UPI apps, cards, cash',
    Icon: CreditCard,
  },
  {
    to: '/settings/places',
    label: 'Places',
    description: 'Saved locations on a map',
    Icon: MapPin,
  },
];

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" />
      <div className="flex flex-col gap-6 p-4">
        <ProfileSection />
        <section className="flex flex-col gap-2">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Manage data
          </h2>
          <ul className="bg-card divide-y rounded-md border">
            {manageLinks.map(({ to, label, description, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="hover:bg-accent focus-visible:ring-ring flex items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Icon className="text-muted-foreground size-5" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{label}</div>
                    <div className="text-muted-foreground text-xs">{description}</div>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <ThemeSwitcher />
        <BackupSection />
      </div>
    </>
  );
}
