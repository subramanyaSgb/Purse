import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { placesRepo } from './places';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('placesRepo', () => {
  it('create() inserts with generated id, createdAt, addressCached=null', async () => {
    const p = await placesRepo.create({
      name: 'Home',
      lat: 12.9716,
      lng: 77.5946,
    });
    expect(p.id).toHaveLength(36);
    expect(p.addressCached).toBeNull();
    expect(p.lastUsedAt).toBeNull();
    expect(p.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('list() sorts by lastUsedAt desc with nulls last', async () => {
    const a = await placesRepo.create({
      name: 'A',
      lat: 0,
      lng: 0,
    });
    const b = await placesRepo.create({ name: 'B', lat: 0, lng: 0 });
    const c = await placesRepo.create({ name: 'C', lat: 0, lng: 0 });

    await placesRepo.touchLastUsed(c.id);
    await new Promise((r) => setTimeout(r, 5));
    await placesRepo.touchLastUsed(a.id);
    // b remains lastUsedAt = null

    const list = await placesRepo.list();
    expect(list.map((p) => p.name)).toEqual(['A', 'C', 'B']);
  });

  it('update() patches fields', async () => {
    const p = await placesRepo.create({ name: 'A', lat: 0, lng: 0 });
    const u = await placesRepo.update(p.id, { addressCached: 'Bangalore' });
    expect(u.addressCached).toBe('Bangalore');
    expect(u.id).toBe(p.id);
  });

  it('touchLastUsed() bumps lastUsedAt', async () => {
    const p = await placesRepo.create({ name: 'A', lat: 0, lng: 0 });
    expect(p.lastUsedAt).toBeNull();
    const u = await placesRepo.touchLastUsed(p.id);
    expect(u.lastUsedAt).not.toBeNull();
  });

  it('remove() rejects when a transaction references the place', async () => {
    const p = await placesRepo.create({ name: 'A', lat: 0, lng: 0 });
    await db.transactions.add({
      id: 't1',
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-11T00:00:00.000Z',
      accountId: 'acc',
      placeId: p.id,
      note: '',
      tagIds: [],
      images: [],
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
    });
    await expect(placesRepo.remove(p.id)).rejects.toThrow();
  });

  it('remove() hard-deletes if unreferenced', async () => {
    const p = await placesRepo.create({ name: 'A', lat: 0, lng: 0 });
    await placesRepo.remove(p.id);
    expect(await placesRepo.get(p.id)).toBeNull();
  });
});
