import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { appMetaRepo } from './appMeta';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('appMetaRepo', () => {
  it('get() returns null on a fresh DB', async () => {
    expect(await appMetaRepo.get()).toBeNull();
  });

  it('update() inserts the singleton if missing then patches it', async () => {
    const a = await appMetaRepo.update({
      userName: 'Subramanya',
      baseCurrency: 'INR',
      defaultTxKind: 'expense',
      theme: 'system',
      gpsEnabled: true,
      schemaVersion: 1,
      appVersion: '0.1.0',
    });
    expect(a.id).toBe('singleton');
    expect(a.userName).toBe('Subramanya');
    expect(a.createdAt).toEqual(a.updatedAt);

    await new Promise((r) => setTimeout(r, 5));
    const b = await appMetaRepo.update({ theme: 'dark' });
    expect(b.id).toBe('singleton');
    expect(b.userName).toBe('Subramanya');
    expect(b.theme).toBe('dark');
    expect(b.createdAt).toBe(a.createdAt);
    expect(b.updatedAt > a.updatedAt).toBe(true);
  });

  it('get() returns the singleton after update', async () => {
    await appMetaRepo.update({
      userName: 'X',
      baseCurrency: 'INR',
      defaultTxKind: 'expense',
      theme: 'light',
      gpsEnabled: false,
      schemaVersion: 1,
      appVersion: '0.1.0',
    });
    const got = await appMetaRepo.get();
    expect(got?.userName).toBe('X');
  });
});
