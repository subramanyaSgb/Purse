import { db } from '@/db/db';
import { imagesService, thumbKeyFor } from './images';
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
