export type ID = string; // UUID v4
export type ISODate = string; // ISO 8601 with milliseconds

export type AccountType = 'cash' | 'bank' | 'card' | 'wallet' | 'savings' | 'rd' | 'asset';
export type CategoryKind = 'expense' | 'income';
export type TxKind = 'expense' | 'income' | 'transfer';
export type PaymentMethodKind = 'upi' | 'card' | 'cash' | 'netbanking' | 'wallet' | 'other';
export type Theme = 'light' | 'dark' | 'system';

export interface Account {
  id: ID;
  name: string;
  type: AccountType;
  bankName?: string;
  currency: string;
  openingBalance: number;
  colour: string;
  icon: string;
  archivedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Category {
  id: ID;
  name: string;
  kind: CategoryKind;
  colour: string;
  icon: string;
  archivedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Subcategory {
  id: ID;
  categoryId: ID;
  name: string;
  icon: string;
  archivedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Tag {
  id: ID;
  name: string;
  nameLower: string;
  usageCount: number;
  lastUsedAt: ISODate | null;
}

export interface Place {
  id: ID;
  name: string;
  lat: number;
  lng: number;
  addressCached: string | null;
  lastUsedAt: ISODate | null;
  createdAt: ISODate;
}

export interface PaymentMethod {
  id: ID;
  name: string;
  kind: PaymentMethodKind;
  icon: string;
  colour: string;
  archivedAt: ISODate | null;
}

export interface Transaction {
  id: ID;
  kind: TxKind;
  amount: number;
  currency: string;
  occurredAt: ISODate;
  accountId: ID;
  toAccountId?: ID;
  categoryId?: ID;
  subcategoryId?: ID;
  placeId?: ID;
  paymentMethodId?: ID;
  note: string;
  tagIds: ID[];
  images: string[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AppMeta {
  id: 'singleton';
  userName: string;
  baseCurrency: string;
  defaultAccountId?: ID;
  defaultTxKind: TxKind;
  theme: Theme;
  gpsEnabled: boolean;
  schemaVersion: number;
  appVersion: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}
