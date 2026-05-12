import { db } from '@/db/db';
import { __opfsRoot, imagesService, thumbKeyFor } from './images';
import type {
  Account,
  AppMeta,
  Category,
  PaymentMethod,
  Place,
  Subcategory,
  Tag,
  Transaction,
} from '@/domain/types';

export const CURRENT_BACKUP_SCHEMA = 1 as const;

/**
 * The exported file shape. Top-level keys mirror Dexie tables 1:1 plus
 * a `meta` block with the schema version and the export timestamp, and
 * an `images` block holding base64-encoded blobs keyed by their OPFS path.
 */
export type BackupFile = {
  meta: {
    schemaVersion: typeof CURRENT_BACKUP_SCHEMA;
    appVersion: string;
    exportedAt: string; // ISO
  };
  appMeta: AppMeta | null;
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  tags: Tag[];
  places: Place[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  /** Maps OPFS key (`txn/<txId>/<i>.jpg` or thumb_*) -> base64 image bytes. */
  images: Record<string, string>;
};

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  // btoa cannot take a Uint8Array directly; build a binary string in
  // ~32 KB chunks to dodge the call-stack limit on String.fromCharCode.
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Build a BackupFile from the current DB + OPFS state. Pure read \xe2\x80\x94 no
 * Dexie writes, no OPFS writes.
 */
export async function buildBackup(): Promise<BackupFile> {
  const [appMeta, accounts, categories, subcategories, tags, places, paymentMethods, transactions] =
    await Promise.all([
      db.appMeta.get('singleton'),
      db.accounts.toArray(),
      db.categories.toArray(),
      db.subcategories.toArray(),
      db.tags.toArray(),
      db.places.toArray(),
      db.paymentMethods.toArray(),
      db.transactions.toArray(),
    ]);

  // For every transaction.images key, also include the derived thumb key.
  const imageKeys = new Set<string>();
  for (const tx of transactions) {
    for (const key of tx.images) {
      imageKeys.add(key);
      imageKeys.add(thumbKeyFor(key));
    }
  }
  const images: Record<string, string> = {};
  for (const key of imageKeys) {
    try {
      const blob = await imagesService.loadBlob(key);
      images[key] = await blobToBase64(blob);
    } catch {
      // Missing OPFS entry \xe2\x80\x94 skip; the import side won't fail on absence
      // and the transaction row still references the key.
    }
  }

  return {
    meta: {
      schemaVersion: CURRENT_BACKUP_SCHEMA,
      appVersion: appMeta?.appVersion ?? '0.0.0',
      exportedAt: new Date().toISOString(),
    },
    appMeta: appMeta ?? null,
    accounts,
    categories,
    subcategories,
    tags,
    places,
    paymentMethods,
    transactions,
    images,
  };
}

/** Filename for the downloaded backup: purse_backup_YYYY-MM-DD_HH-mm.json */
export function defaultBackupFilename(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `purse_backup_${y}-${mo}-${da}_${hh}-${mm}.json`;
}

function base64ToBlob(b64: string, type = 'image/jpeg'): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export type BackupPreview = {
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  counts: {
    accounts: number;
    categories: number;
    subcategories: number;
    tags: number;
    places: number;
    paymentMethods: number;
    transactions: number;
    images: number;
  };
};

export class UnsupportedBackupSchemaError extends Error {
  readonly found: number;
  constructor(found: number) {
    super(
      `Backup uses schema v${found}, this app only supports up to v${CURRENT_BACKUP_SCHEMA}. Update the app first.`,
    );
    this.name = 'UnsupportedBackupSchemaError';
    this.found = found;
  }
}

function isBackupFile(x: unknown): x is BackupFile {
  if (!x || typeof x !== 'object') return false;
  const o = x as Partial<BackupFile>;
  return (
    typeof o.meta === 'object' &&
    o.meta !== null &&
    typeof o.meta.schemaVersion === 'number' &&
    Array.isArray(o.accounts) &&
    Array.isArray(o.categories) &&
    Array.isArray(o.subcategories) &&
    Array.isArray(o.tags) &&
    Array.isArray(o.places) &&
    Array.isArray(o.paymentMethods) &&
    Array.isArray(o.transactions) &&
    typeof o.images === 'object'
  );
}

/**
 * Parse a JSON string into a BackupFile, validating the schema version.
 * Throws on shape mismatch or unsupported newer schemas.
 */
export function parseBackup(json: string): BackupFile {
  const parsed: unknown = JSON.parse(json);
  if (!isBackupFile(parsed)) {
    throw new Error('That file does not look like a Purse backup.');
  }
  if (parsed.meta.schemaVersion > CURRENT_BACKUP_SCHEMA) {
    throw new UnsupportedBackupSchemaError(parsed.meta.schemaVersion);
  }
  return parsed;
}

export function previewBackup(b: BackupFile): BackupPreview {
  return {
    schemaVersion: b.meta.schemaVersion,
    appVersion: b.meta.appVersion,
    exportedAt: b.meta.exportedAt,
    counts: {
      accounts: b.accounts.length,
      categories: b.categories.length,
      subcategories: b.subcategories.length,
      tags: b.tags.length,
      places: b.places.length,
      paymentMethods: b.paymentMethods.length,
      transactions: b.transactions.length,
      images: Object.keys(b.images).length,
    },
  };
}

export type ImportMode = 'replace' | 'merge';

/**
 * Apply a parsed BackupFile to the live database and OPFS.
 *
 * - 'replace' first wipes every table (a single readwrite transaction)
 *   and the txn/ OPFS root, then inserts the file's contents.
 * - 'merge' uses bulkPut so existing rows with the same id are
 *   overwritten and new rows are added; non-conflicting existing rows
 *   are preserved.
 *
 * OPFS image bytes are written outside the Dexie transaction because
 * the File System Access API isn't transactional with IndexedDB. If
 * an image write fails we still leave the row referencing the key;
 * loadBlob will throw on access and the UI surfaces a missing-image
 * empty state in Phase 6 \xe2\x80\x94 acceptable for v0.1.
 */
export async function applyBackup(backup: BackupFile, mode: ImportMode): Promise<void> {
  const tables = [
    db.accounts,
    db.categories,
    db.subcategories,
    db.tags,
    db.places,
    db.paymentMethods,
    db.transactions,
    db.appMeta,
  ];
  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      await Promise.all([
        db.accounts.clear(),
        db.categories.clear(),
        db.subcategories.clear(),
        db.tags.clear(),
        db.places.clear(),
        db.paymentMethods.clear(),
        db.transactions.clear(),
        db.appMeta.clear(),
      ]);
    }
    if (backup.appMeta) await db.appMeta.put(backup.appMeta);
    await db.accounts.bulkPut(backup.accounts);
    await db.categories.bulkPut(backup.categories);
    await db.subcategories.bulkPut(backup.subcategories);
    await db.tags.bulkPut(backup.tags);
    await db.places.bulkPut(backup.places);
    await db.paymentMethods.bulkPut(backup.paymentMethods);
    await db.transactions.bulkPut(backup.transactions);
  });

  // OPFS images \xe2\x80\x94 outside the Dexie transaction.
  if (mode === 'replace') {
    // Wipe every existing txn/<txId> dir. The fake OPFS in tests and the
    // real OPFS in browsers both accept removeEntry with recursive on the
    // txn/ folder; we tolerate missing.
    try {
      const root = await __opfsRoot();
      await root.removeEntry('txn', { recursive: true }).catch(() => {});
    } catch {
      // ignore
    }
  }
  for (const [key, b64] of Object.entries(backup.images)) {
    await writeBlobToKey(key, base64ToBlob(b64));
  }
}

async function writeBlobToKey(key: string, blob: Blob): Promise<void> {
  const root = await __opfsRoot();
  const parts = key.split('/');
  if (parts.length < 2) throw new Error(`Bad image key: ${key}`);
  const fileName = parts.pop()!;
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  const fh = await dir.getFileHandle(fileName, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}

/**
 * Trigger a browser download of the current backup. Returns the filename
 * used, primarily for tests / callers that want to surface a confirmation.
 */
export async function downloadBackup(): Promise<string> {
  const backup = await buildBackup();
  const json = JSON.stringify(backup);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = defaultBackupFilename();
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the click loop so the click handler has time to read it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
