import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';

describe('db', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('has all expected tables', () => {
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'accounts',
        'appMeta',
        'categories',
        'paymentMethods',
        'places',
        'subcategories',
        'tags',
        'transactions',
      ].sort(),
    );
  });

  it('persists and retrieves an account', async () => {
    await db.accounts.put({
      id: 'a1',
      name: 'Cash',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'wallet',
      archivedAt: null,
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
    });
    const a = await db.accounts.get('a1');
    expect(a?.name).toBe('Cash');
  });
});
