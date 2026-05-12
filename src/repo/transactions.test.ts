import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { transactionsRepo } from './transactions';
import { tagsRepo } from './tags';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('transactionsRepo', () => {
  it('create() inserts an expense with id, timestamps', async () => {
    const tx = await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: 'Lunch',
      tagIds: [],
      images: [],
    });
    expect(tx.id).toHaveLength(36);
    expect(tx.kind).toBe('expense');
    expect(tx.createdAt).toEqual(tx.updatedAt);
  });

  it('create() rejects expense with amount <= 0', async () => {
    await expect(
      transactionsRepo.create({
        kind: 'expense',
        amount: 0,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'acc1',
        categoryId: 'cat1',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/amount/i);
    await expect(
      transactionsRepo.create({
        kind: 'expense',
        amount: -5,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'acc1',
        categoryId: 'cat1',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/amount/i);
  });

  it('create() requires categoryId for expense and income', async () => {
    await expect(
      transactionsRepo.create({
        kind: 'expense',
        amount: 1,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'acc1',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/categoryId/);
    await expect(
      transactionsRepo.create({
        kind: 'income',
        amount: 1,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'acc1',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/categoryId/);
  });

  it('create() requires toAccountId for transfer, and rejects same account', async () => {
    await expect(
      transactionsRepo.create({
        kind: 'transfer',
        amount: 1,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'a',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/toAccountId/);
    await expect(
      transactionsRepo.create({
        kind: 'transfer',
        amount: 1,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'a',
        toAccountId: 'a',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/same/);
  });

  it('create() validates that tagIds are real', async () => {
    const tag = await tagsRepo.create({ name: 'Lunch' });
    // valid path
    const okTx = await transactionsRepo.create({
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: '',
      tagIds: [tag.id],
      images: [],
    });
    expect(okTx.tagIds).toEqual([tag.id]);

    // invalid path
    await expect(
      transactionsRepo.create({
        kind: 'expense',
        amount: 1,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'acc1',
        categoryId: 'cat1',
        note: '',
        tagIds: ['ghost-id'],
        images: [],
      }),
    ).rejects.toThrow(/tag/i);
  });

  it('update() bumps updatedAt and preserves id/createdAt', async () => {
    const tx = await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: 'Lunch',
      tagIds: [],
      images: [],
    });
    await new Promise((r) => setTimeout(r, 5));
    const u = await transactionsRepo.update(tx.id, { amount: 120 });
    expect(u.id).toBe(tx.id);
    expect(u.createdAt).toBe(tx.createdAt);
    expect(u.amount).toBe(120);
    expect(u.updatedAt > tx.updatedAt).toBe(true);
  });

  it('update() re-validates the merged record', async () => {
    const tx = await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: '',
      tagIds: [],
      images: [],
    });
    await expect(transactionsRepo.update(tx.id, { amount: 0 })).rejects.toThrow(/amount/i);
  });

  it('remove() hard-deletes', async () => {
    const tx = await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: '',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.remove(tx.id);
    expect(await transactionsRepo.get(tx.id)).toBeNull();
  });
});

describe('transactionsRepo.listByRange', () => {
  async function seed() {
    // April 30
    await transactionsRepo.create({
      kind: 'expense',
      amount: 10,
      currency: 'INR',
      occurredAt: '2026-04-30T00:00:00.000Z',
      accountId: 'a1',
      categoryId: 'c1',
      note: 'last-day-of-april',
      tagIds: [],
      images: [],
    });
    // May 1, 5, 31
    await transactionsRepo.create({
      kind: 'expense',
      amount: 20,
      currency: 'INR',
      occurredAt: '2026-05-01T08:00:00.000Z',
      accountId: 'a1',
      categoryId: 'c1',
      note: 'May the first',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.create({
      kind: 'income',
      amount: 5000,
      currency: 'INR',
      occurredAt: '2026-05-05T08:00:00.000Z',
      accountId: 'a2',
      categoryId: 'c2',
      note: 'salary',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.create({
      kind: 'transfer',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-15T08:00:00.000Z',
      accountId: 'a1',
      toAccountId: 'a2',
      note: 'move to bank',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.create({
      kind: 'expense',
      amount: 30,
      currency: 'INR',
      occurredAt: '2026-05-31T23:59:00.000Z',
      accountId: 'a1',
      categoryId: 'c1',
      paymentMethodId: 'pm1',
      note: 'last expense of may',
      tagIds: [],
      images: [],
    });
    // June 1
    await transactionsRepo.create({
      kind: 'expense',
      amount: 40,
      currency: 'INR',
      occurredAt: '2026-06-01T00:00:00.000Z',
      accountId: 'a1',
      categoryId: 'c1',
      note: 'june first',
      tagIds: [],
      images: [],
    });
  }

  it('returns rows in [start, end), sorted by occurredAt desc', async () => {
    await seed();
    const rows = await transactionsRepo.listByRange(
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
    );
    expect(rows).toHaveLength(4);
    expect(rows[0]!.note).toBe('last expense of may');
    expect(rows.at(-1)!.note).toBe('May the first');
  });

  it('end is exclusive', async () => {
    await seed();
    const rows = await transactionsRepo.listByRange(
      '2026-04-30T00:00:00.000Z',
      '2026-05-01T00:00:00.000Z',
    );
    expect(rows.map((r) => r.note)).toEqual(['last-day-of-april']);
  });

  it('filters by accountId', async () => {
    await seed();
    const rows = await transactionsRepo.listByRange(
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
      { accountId: 'a2' },
    );
    // a2 appears as accountId on the salary row and as toAccountId on the
    // transfer \xe2\x80\x94 only the salary matches the accountId filter.
    expect(rows.map((r) => r.note)).toEqual(['salary']);
  });

  it('filters by kind using compound index path', async () => {
    await seed();
    const rows = await transactionsRepo.listByRange(
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
      { kind: 'expense' },
    );
    expect(rows.map((r) => r.note)).toEqual(['last expense of may', 'May the first']);
  });

  it('filters by paymentMethodId', async () => {
    await seed();
    const rows = await transactionsRepo.listByRange(
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
      { paymentMethodId: 'pm1' },
    );
    expect(rows.map((r) => r.note)).toEqual(['last expense of may']);
  });

  it('filters by tagId', async () => {
    const tag = await tagsRepo.create({ name: 'lunch' });
    await transactionsRepo.create({
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-10T00:00:00.000Z',
      accountId: 'a1',
      categoryId: 'c1',
      note: 'tagged',
      tagIds: [tag.id],
      images: [],
    });
    await transactionsRepo.create({
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-11T00:00:00.000Z',
      accountId: 'a1',
      categoryId: 'c1',
      note: 'untagged',
      tagIds: [],
      images: [],
    });
    const rows = await transactionsRepo.listByRange(
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
      { tagId: tag.id },
    );
    expect(rows.map((r) => r.note)).toEqual(['tagged']);
  });

  it('search matches note case-insensitively', async () => {
    await seed();
    const rows = await transactionsRepo.listByRange(
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
      { search: 'MAY' },
    );
    expect(rows.map((r) => r.note).sort()).toEqual(['May the first', 'last expense of may'].sort());
  });

  it('search matches across category name and place name', async () => {
    await db.categories.add({
      id: 'cFood',
      name: 'Food & Drink',
      kind: 'expense',
      colour: '#000',
      icon: 'a',
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await db.places.add({
      id: 'pTemple',
      name: 'Tirupati Temple',
      lat: 13.68,
      lng: 79.35,
      addressCached: null,
      lastUsedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await transactionsRepo.create({
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-10T00:00:00.000Z',
      accountId: 'a1',
      categoryId: 'cFood',
      note: 'something boring',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.create({
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-11T00:00:00.000Z',
      accountId: 'a1',
      categoryId: 'c1',
      placeId: 'pTemple',
      note: 'whatever',
      tagIds: [],
      images: [],
    });

    const byCat = await transactionsRepo.listByRange(
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
      { search: 'food' },
    );
    expect(byCat.map((r) => r.note)).toEqual(['something boring']);

    const byPlace = await transactionsRepo.listByRange(
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
      { search: 'tirupati' },
    );
    expect(byPlace.map((r) => r.note)).toEqual(['whatever']);
  });

  it('filters compose AND', async () => {
    await seed();
    const rows = await transactionsRepo.listByRange(
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
      { kind: 'expense', accountId: 'a1', search: 'first' },
    );
    expect(rows.map((r) => r.note)).toEqual(['May the first']);
  });
});

describe('transactionsRepo.monthlyTotalsByCategory', () => {
  it('returns [] for a month with no transactions', async () => {
    const rows = await transactionsRepo.monthlyTotalsByCategory('2026-05');
    expect(rows).toEqual([]);
  });

  it('sums by categoryId, excluding transfers', async () => {
    // All times deliberately mid-month so timezone treatment is uniform.
    await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-10T12:00:00.000Z',
      accountId: 'a1',
      categoryId: 'cFood',
      note: '',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.create({
      kind: 'expense',
      amount: 250,
      currency: 'INR',
      occurredAt: '2026-05-20T12:00:00.000Z',
      accountId: 'a1',
      categoryId: 'cFood',
      note: '',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.create({
      kind: 'expense',
      amount: 80,
      currency: 'INR',
      occurredAt: '2026-05-21T12:00:00.000Z',
      accountId: 'a1',
      categoryId: 'cTravel',
      note: '',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.create({
      kind: 'income',
      amount: 50000,
      currency: 'INR',
      occurredAt: '2026-05-15T12:00:00.000Z',
      accountId: 'a1',
      categoryId: 'cSalary',
      note: '',
      tagIds: [],
      images: [],
    });
    // transfer must be excluded
    await transactionsRepo.create({
      kind: 'transfer',
      amount: 9999,
      currency: 'INR',
      occurredAt: '2026-05-16T12:00:00.000Z',
      accountId: 'a1',
      toAccountId: 'a2',
      note: '',
      tagIds: [],
      images: [],
    });

    const rows = await transactionsRepo.monthlyTotalsByCategory('2026-05');
    const byCat = Object.fromEntries(rows.map((r) => [r.categoryId, r]));
    expect(byCat['cFood']).toEqual({ categoryId: 'cFood', total: 350, count: 2 });
    expect(byCat['cTravel']).toEqual({ categoryId: 'cTravel', total: 80, count: 1 });
    expect(byCat['cSalary']).toEqual({ categoryId: 'cSalary', total: 50_000, count: 1 });
    expect(rows.find((r) => r.total === 9999)).toBeUndefined();
  });

  it('honours the IST month boundary (Asia/Kolkata)', async () => {
    // 2026-05-01 00:00 IST = 2026-04-30 18:30 UTC
    // 2026-06-01 00:00 IST = 2026-05-31 18:30 UTC
    //
    // A tx at 2026-04-30T19:00:00Z is 00:30 IST on May 1 \xe2\x80\x94 should belong
    // to the May bucket. A tx at 2026-05-31T19:00:00Z is 00:30 IST on
    // June 1 \xe2\x80\x94 should NOT.
    await transactionsRepo.create({
      kind: 'expense',
      amount: 11,
      currency: 'INR',
      occurredAt: '2026-04-30T19:00:00.000Z', // 00:30 IST on 1 May
      accountId: 'a1',
      categoryId: 'cFood',
      note: 'early-may IST',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.create({
      kind: 'expense',
      amount: 22,
      currency: 'INR',
      occurredAt: '2026-05-31T19:00:00.000Z', // 00:30 IST on 1 June
      accountId: 'a1',
      categoryId: 'cFood',
      note: 'early-june IST',
      tagIds: [],
      images: [],
    });

    const rows = await transactionsRepo.monthlyTotalsByCategory('2026-05');
    expect(rows).toEqual([{ categoryId: 'cFood', total: 11, count: 1 }]);
  });
});
