import { db } from '@/db/db';
import { newId, nowIso } from '@/lib/ids';
import type { Account, AppMeta, Category, PaymentMethod, Subcategory, Tag } from '@/domain/types';
import {
  DEFAULT_ACCOUNT,
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_TAGS,
} from './defaults';

const APP_VERSION = '0.1.0';
const SCHEMA_VERSION = 1;

/**
 * First-launch seed. Inserts the default Cash account, the full category +
 * subcategory tree (Wallet defaults + India additions), the seeded payment
 * methods, two reimbursement tags, and an appMeta row. The presence of
 * appMeta is the "already seeded" sentinel: a second call is a no-op.
 *
 * Everything happens inside a single Dexie readwrite transaction so a
 * partial failure leaves no half-state \xe2\x80\x94 the next launch starts fresh.
 */
export async function seedIfEmpty(): Promise<void> {
  const existing = await db.appMeta.get('singleton');
  if (existing) return;

  await db.transaction(
    'rw',
    [db.accounts, db.categories, db.subcategories, db.tags, db.paymentMethods, db.appMeta],
    async () => {
      const now = nowIso();

      // 1. Default account
      const account: Account = {
        ...DEFAULT_ACCOUNT,
        id: newId(),
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await db.accounts.add(account);

      // 2. Categories + nested subcategories
      for (const c of DEFAULT_CATEGORIES) {
        const cat: Category = {
          id: newId(),
          name: c.name,
          kind: c.kind,
          colour: c.colour,
          icon: c.icon,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        await db.categories.add(cat);
        for (const subName of c.subcategories) {
          const sub: Subcategory = {
            id: newId(),
            categoryId: cat.id,
            name: subName,
            icon: c.icon,
            archivedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          await db.subcategories.add(sub);
        }
      }

      // 3. Payment methods
      for (const pm of DEFAULT_PAYMENT_METHODS) {
        const row: PaymentMethod = { ...pm, id: newId(), archivedAt: null };
        await db.paymentMethods.add(row);
      }

      // 4. Reimbursement tags
      for (const name of DEFAULT_TAGS) {
        const tag: Tag = {
          id: newId(),
          name,
          nameLower: name.toLowerCase(),
          usageCount: 0,
          lastUsedAt: null,
        };
        await db.tags.add(tag);
      }

      // 5. AppMeta sentinel \xe2\x80\x94 last, so a crash before this point looks
      //    like "not yet seeded" and we retry on next launch.
      const meta: AppMeta = {
        id: 'singleton',
        userName: '',
        baseCurrency: 'INR',
        defaultAccountId: account.id,
        defaultTxKind: 'expense',
        theme: 'system',
        gpsEnabled: true,
        schemaVersion: SCHEMA_VERSION,
        appVersion: APP_VERSION,
        createdAt: now,
        updatedAt: now,
      };
      await db.appMeta.add(meta);
    },
  );
}
