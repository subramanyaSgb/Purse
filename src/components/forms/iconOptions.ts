import {
  Wallet,
  Landmark,
  CreditCard,
  Banknote,
  PiggyBank,
  Coins,
  Building2,
  Home,
  Briefcase,
  Car,
  Smartphone,
  Gem,
  Gift,
  Heart,
  Trophy,
  TrendingUp,
  HandCoins,
  Scale,
  Scroll,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  Bus,
  Drama,
  Flame,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react';

/** Curated 24-icon shortlist used everywhere we let the user pick an icon. */
export const ICON_OPTIONS: Array<{ name: string; Icon: LucideIcon }> = [
  { name: 'wallet', Icon: Wallet },
  { name: 'landmark', Icon: Landmark },
  { name: 'credit-card', Icon: CreditCard },
  { name: 'banknote', Icon: Banknote },
  { name: 'piggy-bank', Icon: PiggyBank },
  { name: 'coins', Icon: Coins },
  { name: 'building-2', Icon: Building2 },
  { name: 'home', Icon: Home },
  { name: 'briefcase', Icon: Briefcase },
  { name: 'car', Icon: Car },
  { name: 'smartphone', Icon: Smartphone },
  { name: 'gem', Icon: Gem },
  { name: 'gift', Icon: Gift },
  { name: 'heart', Icon: Heart },
  { name: 'trophy', Icon: Trophy },
  { name: 'trending-up', Icon: TrendingUp },
  { name: 'hand-coins', Icon: HandCoins },
  { name: 'scale', Icon: Scale },
  { name: 'scroll', Icon: Scroll },
  { name: 'receipt', Icon: Receipt },
  { name: 'shopping-bag', Icon: ShoppingBag },
  { name: 'shopping-cart', Icon: ShoppingCart },
  { name: 'utensils', Icon: Utensils },
  { name: 'bus', Icon: Bus },
];

/** Seed icons that aren't in the picker shortlist; we still want to render them. */
const FALLBACK_ICONS: Record<string, LucideIcon> = {
  drama: Drama,
  flame: Flame,
  'circle-help': CircleHelp,
};

/** Look up a lucide icon component by its name; returns CircleHelp if unknown. */
export function iconByName(name: string | undefined): LucideIcon {
  if (!name) return CircleHelp;
  const fromPicker = ICON_OPTIONS.find((o) => o.name === name);
  if (fromPicker) return fromPicker.Icon;
  return FALLBACK_ICONS[name] ?? CircleHelp;
}
