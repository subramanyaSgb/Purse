import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/db';
import { FakeOpfsDir } from '@/test/fakeOpfs';
import { imagesService, __setOpfsRootForTesting, __setCompressorForTesting } from './images';
import { buildBackup, CURRENT_BACKUP_SCHEMA, defaultBackupFilename } from './backup';
import { accountsRepo } from '@/repo/accounts';
import { transactionsRepo } from '@/repo/transactions';
import { appMetaRepo } from '@/repo/appMeta';

beforeEach(async () => {
  await db.delete();
  await db.open();
  __setOpfsRootForTesting(new FakeOpfsDir());
  __setCompressorForTesting(async (file) => file);
});

afterEach(() => {
  __setOpfsRootForTesting(null);
  __setCompressorForTesting(null);
});

describe('buildBackup', () => {
  it('produces a JSON object whose top-level keys match the schema', async () => {
    const b = await buildBackup();
    expect(b.meta.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA);
    expect(Object.keys(b).sort()).toEqual(
      [
        'accounts',
        'appMeta',
        'categories',
        'images',
        'meta',
        'paymentMethods',
        'places',
        'subcategories',
        'tags',
        'transactions',
      ].sort(),
    );
  });

  it('serialises rows from every Dexie table', async () => {
    await appMetaRepo.update({
      userName: 'Sub',
      baseCurrency: 'INR',
      defaultTxKind: 'expense',
      theme: 'system',
      gpsEnabled: true,
      schemaVersion: 1,
      appVersion: '0.1.0',
    });
    const acc = await accountsRepo.create({
      name: 'Cash',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'wallet',
    });
    await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-12T10:00:00.000Z',
      accountId: acc.id,
      categoryId: 'cFood',
      note: 'lunch',
      tagIds: [],
      images: [],
    });

    const b = await buildBackup();
    expect(b.accounts).toHaveLength(1);
    expect(b.accounts[0]!.name).toBe('Cash');
    expect(b.transactions).toHaveLength(1);
    expect(b.transactions[0]!.note).toBe('lunch');
    expect(b.appMeta?.userName).toBe('Sub');
  });

  it('inlines image bytes as base64 keyed by OPFS path', async () => {
    const acc = await accountsRepo.create({
      name: 'Cash',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'wallet',
    });
    const [mainKey] = await imagesService.saveForTransaction('txZ', [
      new File(['hello'], 'a.jpg', { type: 'image/jpeg' }),
    ]);
    await transactionsRepo.create({
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-12T10:00:00.000Z',
      accountId: acc.id,
      categoryId: 'cFood',
      note: '',
      tagIds: [],
      images: [mainKey!],
    });

    const b = await buildBackup();
    expect(Object.keys(b.images)).toContain(mainKey);
    expect(Object.keys(b.images)).toContain('txn/txZ/thumb_0.jpg');
    // 'hello' base64 = aGVsbG8=
    expect(b.images[mainKey!]).toBe('aGVsbG8=');
  });
});

describe('defaultBackupFilename', () => {
  it('formats purse_backup_YYYY-MM-DD_HH-mm.json', () => {
    const d = new Date(2026, 4, 12, 9, 5);
    expect(defaultBackupFilename(d)).toBe('purse_backup_2026-05-12_09-05.json');
  });
});
