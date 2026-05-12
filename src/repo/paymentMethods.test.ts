import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { paymentMethodsRepo } from './paymentMethods';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('paymentMethodsRepo', () => {
  it('create() inserts with generated id, archivedAt = null', async () => {
    const p = await paymentMethodsRepo.create({
      name: 'PhonePe',
      kind: 'upi',
      icon: 'phone',
      colour: '#5f259f',
    });
    expect(p.id).toHaveLength(36);
    expect(p.archivedAt).toBeNull();
  });

  it('list() returns non-archived, sorted by name', async () => {
    await paymentMethodsRepo.create({
      name: 'Zebra',
      kind: 'card',
      icon: 'a',
      colour: '#000',
    });
    await paymentMethodsRepo.create({
      name: 'Apple',
      kind: 'card',
      icon: 'a',
      colour: '#000',
    });
    const c = await paymentMethodsRepo.create({
      name: 'Mango',
      kind: 'card',
      icon: 'a',
      colour: '#000',
    });
    await paymentMethodsRepo.archive(c.id);
    const list = await paymentMethodsRepo.list();
    expect(list.map((x) => x.name)).toEqual(['Apple', 'Zebra']);
  });

  it('list({ kind }) filters by kind', async () => {
    await paymentMethodsRepo.create({
      name: 'GPay',
      kind: 'upi',
      icon: 'a',
      colour: '#000',
    });
    await paymentMethodsRepo.create({
      name: 'Cash',
      kind: 'cash',
      icon: 'a',
      colour: '#000',
    });
    const upis = await paymentMethodsRepo.list({ kind: 'upi' });
    expect(upis.map((x) => x.name)).toEqual(['GPay']);
  });

  it('update() patches and persists', async () => {
    const p = await paymentMethodsRepo.create({
      name: 'A',
      kind: 'upi',
      icon: 'a',
      colour: '#000',
    });
    const u = await paymentMethodsRepo.update(p.id, { name: 'B' });
    expect(u.name).toBe('B');
  });

  it('remove() rejects when a transaction references it', async () => {
    const p = await paymentMethodsRepo.create({
      name: 'A',
      kind: 'upi',
      icon: 'a',
      colour: '#000',
    });
    await db.transactions.add({
      id: 't1',
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-11T00:00:00.000Z',
      accountId: 'acc',
      paymentMethodId: p.id,
      note: '',
      tagIds: [],
      images: [],
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
    });
    await expect(paymentMethodsRepo.remove(p.id)).rejects.toThrow();
  });

  it('remove() hard-deletes if unreferenced', async () => {
    const p = await paymentMethodsRepo.create({
      name: 'A',
      kind: 'upi',
      icon: 'a',
      colour: '#000',
    });
    await paymentMethodsRepo.remove(p.id);
    expect(await paymentMethodsRepo.get(p.id)).toBeNull();
  });
});
