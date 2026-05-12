import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Category,
  Subcategory,
  Tag,
  Place,
  PaymentMethod,
  Transaction,
  AppMeta,
} from '@/domain/types';

export class PurseDB extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  subcategories!: Table<Subcategory, string>;
  tags!: Table<Tag, string>;
  places!: Table<Place, string>;
  paymentMethods!: Table<PaymentMethod, string>;
  transactions!: Table<Transaction, string>;
  appMeta!: Table<AppMeta, string>;

  constructor() {
    super('purse');
    this.version(1).stores({
      accounts: 'id, name, type, archivedAt',
      categories: 'id, name, kind, archivedAt',
      subcategories: 'id, categoryId, name, archivedAt',
      tags: 'id, &nameLower, lastUsedAt',
      places: 'id, name, lastUsedAt',
      paymentMethods: 'id, name, kind, archivedAt',
      transactions:
        'id, occurredAt, accountId, toAccountId, categoryId, subcategoryId, placeId, paymentMethodId, *tagIds, kind, [kind+occurredAt], [accountId+occurredAt]',
      appMeta: 'id',
    });
  }
}

export const db = new PurseDB();
