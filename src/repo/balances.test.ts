import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { accountsRepo } from './accounts';
import { transactionsRepo } from './transactions';
import { balancesRepo } from './balances';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('balancesRepo.compute', () => {
  it('returns openingBalance for every account when there are no transactions', async () => {
    const a = await accountsRepo.create({
      name: 'Cash',
      type: 'cash',
      currency: 'INR',
      openingBalance: 1000,
      colour: '#000',
      icon: 'a',
    });
    const b = await accountsRepo.create({
      name: 'Bank',
      type: 'bank',
      currency: 'INR',
      openingBalance: 50_000,
      colour: '#000',
      icon: 'a',
    });
    const map = await balancesRepo.compute();
    expect(map.get(a.id)).toBe(1000);
    expect(map.get(b.id)).toBe(50_000);
  });

  it('income adds, expense subtracts, transfers move both sides', async () => {
    const cash = await accountsRepo.create({
      name: 'Cash',
      type: 'cash',
      currency: 'INR',
      openingBalance: 1000,
      colour: '#000',
      icon: 'a',
    });
    const bank = await accountsRepo.create({
      name: 'Bank',
      type: 'bank',
      currency: 'INR',
      openingBalance: 10_000,
      colour: '#000',
      icon: 'a',
    });
    // +5000 income to bank
    await transactionsRepo.create({
      kind: 'income',
      amount: 5000,
      currency: 'INR',
      occurredAt: '2026-05-01T00:00:00.000Z',
      accountId: bank.id,
      categoryId: 'cSalary',
      note: '',
      tagIds: [],
      images: [],
    });
    // -200 expense from cash
    await transactionsRepo.create({
      kind: 'expense',
      amount: 200,
      currency: 'INR',
      occurredAt: '2026-05-02T00:00:00.000Z',
      accountId: cash.id,
      categoryId: 'cFood',
      note: '',
      tagIds: [],
      images: [],
    });
    // transfer 500 bank -> cash
    await transactionsRepo.create({
      kind: 'transfer',
      amount: 500,
      currency: 'INR',
      occurredAt: '2026-05-03T00:00:00.000Z',
      accountId: bank.id,
      toAccountId: cash.id,
      note: '',
      tagIds: [],
      images: [],
    });

    const map = await balancesRepo.compute();
    // cash: 1000 - 200 + 500 = 1300
    expect(map.get(cash.id)).toBe(1300);
    // bank: 10_000 + 5000 - 500 = 14_500
    expect(map.get(bank.id)).toBe(14_500);
  });

  it('archived accounts still appear in the map', async () => {
    const a = await accountsRepo.create({
      name: 'Old Card',
      type: 'card',
      currency: 'INR',
      openingBalance: -200,
      colour: '#000',
      icon: 'a',
    });
    await accountsRepo.archive(a.id);
    const map = await balancesRepo.compute();
    expect(map.has(a.id)).toBe(true);
    expect(map.get(a.id)).toBe(-200);
  });

  it('asOf ignores future-dated transactions', async () => {
    const a = await accountsRepo.create({
      name: 'A',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'a',
    });
    await transactionsRepo.create({
      kind: 'income',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-10T00:00:00.000Z',
      accountId: a.id,
      categoryId: 'c',
      note: 'past',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.create({
      kind: 'income',
      amount: 500,
      currency: 'INR',
      occurredAt: '2026-06-01T00:00:00.000Z',
      accountId: a.id,
      categoryId: 'c',
      note: 'future',
      tagIds: [],
      images: [],
    });
    const map = await balancesRepo.compute(new Date('2026-05-20T00:00:00.000Z'));
    expect(map.get(a.id)).toBe(100);
  });
});
