import type { AccountType, CategoryKind, PaymentMethodKind } from '@/domain/types';

/**
 * Seed lists for the first-launch flow. Names match Appendix A + B of the
 * design doc verbatim. Icons are lucide names. Colours are semantic Tailwind
 * stops at 500 weight unless stated.
 */

export type DefaultAccount = {
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: number;
  colour: string;
  icon: string;
};

export const DEFAULT_ACCOUNT: DefaultAccount = {
  name: 'Cash',
  type: 'cash',
  currency: 'INR',
  openingBalance: 0,
  colour: '#16a34a',
  icon: 'wallet',
};

export type DefaultCategory = {
  /** stable internal slug \xe2\x80\x94 not stored, used by seed code to match
   *  subcategories to their parent without depending on generated UUIDs. */
  slug: string;
  name: string;
  kind: CategoryKind;
  colour: string;
  icon: string;
  subcategories: string[];
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Expense
  {
    slug: 'food',
    name: 'Food & Drinks',
    kind: 'expense',
    colour: '#f59e0b',
    icon: 'utensils',
    subcategories: ['Bar/caf\xc3\xa9', 'Groceries', 'Restaurant', 'Fast food'],
  },
  {
    slug: 'shopping',
    name: 'Shopping',
    kind: 'expense',
    colour: '#ec4899',
    icon: 'shopping-bag',
    subcategories: [
      'Clothes & shoes',
      'Drugstore/chemist',
      'Electronics & accessories',
      'Free time',
      'Gifts & joy',
      'Health & beauty',
      'Home & garden',
      'Jewels & accessories',
      'Kids',
      'Pets/animals',
      'Stationery/tools',
    ],
  },
  {
    slug: 'housing',
    name: 'Housing',
    kind: 'expense',
    colour: '#0ea5e9',
    icon: 'home',
    subcategories: [
      'Energy & utilities',
      'Maintenance & repairs',
      'Mortgage',
      'Property insurance',
      'Rent',
      'Services',
    ],
  },
  {
    slug: 'transportation',
    name: 'Transportation',
    kind: 'expense',
    colour: '#eab308',
    icon: 'bus',
    subcategories: ['Business trips', 'Long distance', 'Public transport', 'Taxi'],
  },
  {
    slug: 'vehicle',
    name: 'Vehicle',
    kind: 'expense',
    colour: '#dc2626',
    icon: 'car',
    subcategories: [
      'Fuel',
      'Leasing',
      'Parking',
      'Rentals',
      'Vehicle insurance',
      'Vehicle maintenance',
    ],
  },
  {
    slug: 'life-entertainment',
    name: 'Life & Entertainment',
    kind: 'expense',
    colour: '#a855f7',
    icon: 'drama',
    subcategories: [
      'Active sport & fitness',
      'Alcohol & tobacco',
      'Books, audio, subscriptions',
      'Charity & gifts',
      'Culture & sport events',
      'Education & development',
      'Healthcare & doctor',
      'Hobbies',
      'Holiday, trips, hotels',
      'Life events',
      'Lottery, gambling',
      'TV, Streaming',
      'Wellness & beauty',
    ],
  },
  {
    slug: 'communication-pc',
    name: 'Communication, PC',
    kind: 'expense',
    colour: '#6366f1',
    icon: 'smartphone',
    subcategories: ['Internet', 'Phone, cell phone', 'Postal services', 'Software, apps, games'],
  },
  {
    slug: 'financial-expenses',
    name: 'Financial expenses',
    kind: 'expense',
    colour: '#64748b',
    icon: 'banknote',
    subcategories: [
      'Advisory',
      'Charges & fees',
      'Child support',
      'Fines',
      'Insurances',
      'Loan, interests',
      'Taxes',
    ],
  },
  {
    slug: 'investments',
    name: 'Investments',
    kind: 'expense',
    colour: '#14b8a6',
    icon: 'trending-up',
    subcategories: [
      'Collections',
      'Financial investments',
      'Realty',
      'Savings',
      'Vehicles, chattels',
    ],
  },
  // India additions (expense)
  {
    slug: 'temple',
    name: 'Temple',
    kind: 'expense',
    colour: '#f97316',
    icon: 'flame',
    subcategories: ['General', 'Donation', 'Prasadam', 'Kalyanostsawam'],
  },
  {
    slug: 'office',
    name: 'Office',
    kind: 'expense',
    colour: '#475569',
    icon: 'briefcase',
    subcategories: ['Travel', 'Food', 'Hardware', 'Other'],
  },
  {
    slug: 'family-support',
    name: 'Family Support',
    kind: 'expense',
    colour: '#be185d',
    icon: 'heart',
    subcategories: ['Mom', 'Dad', 'Sister', 'Wife', 'Other'],
  },
  // Income
  {
    slug: 'income',
    name: 'Income',
    kind: 'income',
    colour: '#22c55e',
    icon: 'wallet',
    subcategories: [
      'Checks, coupons',
      'Child support',
      'Dues & grants',
      'Gifts',
      'Interests, dividends',
      'Lending, renting',
      'Lottery, gambling',
      'Refunds (tax, purchase)',
      'Rental income',
      'Sale',
      'Wage, invoices',
    ],
  },
  {
    slug: 'cashback-interest',
    name: 'Cashback & Interest',
    kind: 'income',
    colour: '#84cc16',
    icon: 'piggy-bank',
    subcategories: ['UPI Rewards', 'Bank Interest', 'App Cashback'],
  },
  // Other (expense kind by convention \xe2\x80\x94 falls under "what did I spend on")
  {
    slug: 'others',
    name: 'Others',
    kind: 'expense',
    colour: '#9ca3af',
    icon: 'circle-help',
    subcategories: ['Other'],
  },
];

export type DefaultPaymentMethod = {
  name: string;
  kind: PaymentMethodKind;
  icon: string;
  colour: string;
};

export const DEFAULT_PAYMENT_METHODS: DefaultPaymentMethod[] = [
  { name: 'PhonePe', kind: 'upi', icon: 'phone', colour: '#5f259f' },
  { name: 'Google Pay', kind: 'upi', icon: 'phone', colour: '#1a73e8' },
  { name: 'BHIM', kind: 'upi', icon: 'phone', colour: '#00a651' },
  { name: 'Paytm', kind: 'upi', icon: 'phone', colour: '#00baf2' },
  { name: 'Bank App', kind: 'netbanking', icon: 'landmark', colour: '#0369a1' },
  { name: 'Card', kind: 'card', icon: 'credit-card', colour: '#334155' },
  { name: 'NetBanking', kind: 'netbanking', icon: 'landmark', colour: '#1e40af' },
  { name: 'Cash', kind: 'cash', icon: 'banknote', colour: '#16a34a' },
  { name: 'CRED', kind: 'wallet', icon: 'wallet', colour: '#0f172a' },
  { name: 'Other', kind: 'other', icon: 'more-horizontal', colour: '#64748b' },
];

export const DEFAULT_TAGS: string[] = ['reimburse-pending', 'reimbursed'];
