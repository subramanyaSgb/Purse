import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/db';
import { FakeOpfsDir } from '@/test/fakeOpfs';
import { imagesService, __setOpfsRootForTesting, __setCompressorForTesting } from './images';
import {
  applyBackup,
  buildBackup,
  CURRENT_BACKUP_SCHEMA,
  defaultBackupFilename,
  parseBackup,
  previewBackup,
  UnsupportedBackupSchemaError,
  type BackupFile,
} from './backup';
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

describe('parseBackup', () => {
  it('parses a valid backup', async () => {
    const original = await buildBackup();
    const parsed = parseBackup(JSON.stringify(original));
    expect(parsed.meta.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA);
  });

  it('rejects garbage JSON', () => {
    expect(() => parseBackup('{}')).toThrow(/does not look like/);
    expect(() => parseBackup('{"meta":{"schemaVersion":1}}')).toThrow(/does not look like/);
  });

  it('rejects newer schemas with UnsupportedBackupSchemaError', () => {
    const future: BackupFile = {
      meta: {
        schemaVersion: 99 as unknown as 1,
        appVersion: '99.0.0',
        exportedAt: '2099-01-01T00:00:00.000Z',
      },
      appMeta: null,
      accounts: [],
      categories: [],
      subcategories: [],
      tags: [],
      places: [],
      paymentMethods: [],
      transactions: [],
      images: {},
    };
    expect(() => parseBackup(JSON.stringify(future))).toThrow(UnsupportedBackupSchemaError);
  });
});

describe('previewBackup', () => {
  it('counts entities in each top-level array', async () => {
    await accountsRepo.create({
      name: 'A',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'wallet',
    });
    const b = await buildBackup();
    const p = previewBackup(b);
    expect(p.counts.accounts).toBe(1);
    expect(p.counts.transactions).toBe(0);
    expect(p.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA);
  });
});

describe('applyBackup', () => {
  it('replace: wipes existing rows then inserts file contents', async () => {
    // Seed: 2 accounts pre-existing
    await accountsRepo.create({
      name: 'Pre1',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'wallet',
    });
    await accountsRepo.create({
      name: 'Pre2',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'wallet',
    });

    // Build a backup whose accounts list contains a SINGLE 'Post' account.
    const backup: BackupFile = {
      meta: {
        schemaVersion: CURRENT_BACKUP_SCHEMA,
        appVersion: '0.1.0',
        exportedAt: new Date().toISOString(),
      },
      appMeta: null,
      accounts: [
        {
          id: 'post-id',
          name: 'Post',
          type: 'cash',
          currency: 'INR',
          openingBalance: 0,
          colour: '#000',
          icon: 'wallet',
          archivedAt: null,
          createdAt: '2026-05-12T00:00:00.000Z',
          updatedAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      categories: [],
      subcategories: [],
      tags: [],
      places: [],
      paymentMethods: [],
      transactions: [],
      images: {},
    };

    await applyBackup(backup, 'replace');
    const after = await accountsRepo.list();
    expect(after.map((a) => a.name)).toEqual(['Post']);
  });

  it('merge: preserves existing rows and overwrites by id', async () => {
    const a = await accountsRepo.create({
      name: 'Original',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'wallet',
    });
    const backup: BackupFile = {
      meta: {
        schemaVersion: CURRENT_BACKUP_SCHEMA,
        appVersion: '0.1.0',
        exportedAt: new Date().toISOString(),
      },
      appMeta: null,
      accounts: [
        { ...a, name: 'Renamed by import' }, // same id, new name \xe2\x86\x92 should overwrite
        {
          id: 'merged-new',
          name: 'NewByMerge',
          type: 'cash',
          currency: 'INR',
          openingBalance: 0,
          colour: '#000',
          icon: 'wallet',
          archivedAt: null,
          createdAt: '2026-05-12T00:00:00.000Z',
          updatedAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      categories: [],
      subcategories: [],
      tags: [],
      places: [],
      paymentMethods: [],
      transactions: [],
      images: {},
    };
    await applyBackup(backup, 'merge');
    const after = await accountsRepo.list();
    expect(after.map((x) => x.name).sort()).toEqual(['NewByMerge', 'Renamed by import']);
  });

  it('restores OPFS image bytes from base64', async () => {
    const backup: BackupFile = {
      meta: {
        schemaVersion: CURRENT_BACKUP_SCHEMA,
        appVersion: '0.1.0',
        exportedAt: new Date().toISOString(),
      },
      appMeta: null,
      accounts: [],
      categories: [],
      subcategories: [],
      tags: [],
      places: [],
      paymentMethods: [],
      transactions: [],
      images: { 'txn/abc/0.jpg': 'aGVsbG8=' },
    };
    await applyBackup(backup, 'replace');
    const blob = await imagesService.loadBlob('txn/abc/0.jpg');
    expect(await blob.text()).toBe('hello');
  });
});
