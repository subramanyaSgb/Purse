# Purse — Design Document

| | |
|---|---|
| **Project** | Purse — a local-first personal finance PWA |
| **Repository** | https://github.com/subramanyaSgb/Purse |
| **Hosting** | Vercel (static) — GitHub-connected continuous deploy |
| **Status** | Design complete, ready for implementation planning |
| **Author** | Subramanya Bellary (`subramanya.bellary@deeviasoftware.com`) |
| **Brainstormed with** | Claude (Opus 4.7) |
| **Date** | 2026-05-11 |
| **Schema version** | 1 |

---

## 1. Overview

Purse is a personal expense tracker built as an installable PWA. It replaces the user's previous app (Paisa) with a leaner, faster, customisable equivalent inspired by Wallet by BudgetBakers — keeping the features the user actually values (nested categories, GPS-tagged transactions, receipt images, payment-method tracking, reimbursement workflow) while dropping unused complexity.

### Core promise

> **All data lives on your device.** Vercel serves only the static app shell. Nothing about your money is ever uploaded.

### Why local-first

- Privacy by default — finances never touch a server.
- Works fully offline once installed.
- Easy to back up (one JSON export) and easy to migrate (one JSON import).
- No backend cost, no sync conflicts, no account to create.

### Future hook

The repository layer is designed so a server adapter can be added later without UI changes. This is intentional: local-first now, optional cloud sync later.

---

## 2. Goals & non-goals

### Goals (in scope for MVP)

- Four pages: Dashboard, Transactions, Accounts, Settings.
- Three transaction kinds: Expense, Income, Transfer (transfers excluded from spend totals).
- Nested categories (Wallet-style: Category → Subcategory) with Wallet's default tree seeded on first launch, plus India-specific additions (Temple, Cashback & Interest, Office, Family Support, Phone Recharge).
- Tags as free-form cross-cut labels; multi-tag per transaction; auto-create on type.
- Reusable Places with auto-GPS suggestion within 200 m.
- Multi-image attachments per transaction (camera or gallery), compressed to ≤1600 px.
- Payment-method tracking (PhonePe / GPay / BHIM / Paytm / Bank App / Card / Cash / NetBanking) per transaction.
- Reimbursement workflow for Office expenses (tag-based, with a Dashboard "pending reimbursements" chip).
- Backup & restore via JSON export/import.
- Installable to Android home screen; works offline.

### Non-goals (deferred to v2 or later)

- Recurring transactions.
- Multi-currency per transaction (one base currency; field is on the row so the migration is trivial later).
- Budgets, goals, loans.
- Bill splitting with named people (the original "Party/People" concept is dropped for MVP).
- Cloud sync, multi-device, multi-user.
- Importing legacy Paisa data (user chose a fresh start).
- OCR on receipts.
- Direct bank/UPI integration.

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite + TypeScript (strict) |
| Routing | React Router (4 tab routes + modal routes) |
| State | React Query for repo reads; Zustand for UI/form state |
| Data | Dexie 4 (IndexedDB wrapper) for structured rows |
| Files | OPFS (`navigator.storage.getDirectory()`) for image blobs |
| Styling | Tailwind CSS + shadcn/ui (Radix-based components) |
| Charts | Recharts |
| Maps | Leaflet + OpenStreetMap tiles |
| PWA | `vite-plugin-pwa` (Workbox) with `autoUpdate` |
| Tests | Vitest + React Testing Library + fake-indexeddb + Playwright |
| Lint/format | ESLint + Prettier; commit-time `lint-staged` |
| CI/CD | GitHub Actions → Vercel preview + production deploy |

All client-side. No environment variables. No secrets.

---

## 4. Data model

Seven tables. UUIDs everywhere (`crypto.randomUUID()`). Soft-deletes via `archivedAt` so old reports stay correct after a user "deletes" an account or category. Timestamps are ISO 8601 strings.

### 4.1 Schema

```ts
// accounts
{
  id: string;                       // uuid
  name: string;                     // "Salary", "Jupiter", "Cash"
  type: 'cash' | 'bank' | 'card' | 'wallet' | 'savings' | 'rd' | 'asset';
  bankName?: string;                // optional, e.g. "HDFC" — disambiguates two savings accounts
  currency: string;                 // ISO 4217, defaults "INR"
  openingBalance: number;           // signed; in account's currency
  colour: string;                   // hex
  icon: string;                     // shadcn/lucide icon name
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// categories
{
  id: string;
  name: string;
  kind: 'expense' | 'income';       // determines which side it appears on
  colour: string;
  icon: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// subcategories — children of a category
{
  id: string;
  categoryId: string;               // FK → categories.id
  name: string;
  icon: string;                     // colour inherited from parent
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// tags — free-form, auto-created on type
{
  id: string;
  name: string;                     // display form
  nameLower: string;                // for case-insensitive uniqueness
  usageCount: number;               // for "most used first" sort
  lastUsedAt: string | null;
}

// places — GPS + name, reusable
{
  id: string;
  name: string;
  lat: number;
  lng: number;
  addressCached: string | null;     // reverse-geocoded (optional, not done in MVP)
  lastUsedAt: string | null;
  createdAt: string;
}

// paymentMethods
{
  id: string;
  name: string;                     // "PhonePe", "Card – ICICI"
  kind: 'upi' | 'card' | 'cash' | 'netbanking' | 'wallet' | 'other';
  icon: string;
  colour: string;
  archivedAt: string | null;
}

// transactions — the ledger row
{
  id: string;
  kind: 'expense' | 'income' | 'transfer';
  amount: number;                   // always positive; sign derived from kind
  currency: string;                 // copies account.currency at save time
  occurredAt: string;               // user-editable date/time
  accountId: string;                // "From" account for transfers
  toAccountId?: string;             // transfers only
  categoryId?: string;              // expense/income only
  subcategoryId?: string;
  placeId?: string;                 // expense only
  paymentMethodId?: string;
  note: string;                     // free text ("Details")
  tagIds: string[];
  images: string[];                 // OPFS file keys, e.g. "txn/<uuid>/0.jpg"
  createdAt: string;
  updatedAt: string;
}

// appMeta — single-row settings
{
  id: 'singleton';
  userName: string;
  baseCurrency: string;             // "INR"
  defaultAccountId?: string;
  defaultTxKind: 'expense' | 'income' | 'transfer';
  theme: 'light' | 'dark' | 'system';
  gpsEnabled: boolean;
  schemaVersion: number;            // 1
  appVersion: string;               // from package.json at build time
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Dexie indexes

```ts
db.version(1).stores({
  accounts:        'id, name, type, archivedAt',
  categories:      'id, name, kind, archivedAt',
  subcategories:   'id, categoryId, name, archivedAt',
  tags:            'id, &nameLower, lastUsedAt',
  places:          'id, name, lastUsedAt',
  paymentMethods:  'id, name, kind, archivedAt',
  transactions:    'id, occurredAt, accountId, toAccountId, categoryId, subcategoryId, placeId, paymentMethodId, *tagIds, kind, [kind+occurredAt], [accountId+occurredAt]',
  appMeta:         'id',
});
```

Key choices explained:

- `tags.&nameLower` — unique constraint, case-insensitive ("Food" and "food" are the same tag).
- `transactions.*tagIds` — multi-entry index so "find all txns with tag X" is fast.
- `[kind+occurredAt]` — Dashboard "expense this month by category" query.
- `[accountId+occurredAt]` — per-account history.

### 4.3 Computed values (no separate table)

- **Account balance** = `openingBalance + Σ(income to it) + Σ(transfer-in) − Σ(expense from it) − Σ(transfer-out)`. Memoised in a `useBalances()` hook; invalidates on any txn mutation.
- **Dashboard totals** = Dexie aggregations on `[kind+occurredAt]` index, transfers excluded.
- **Tag `usageCount`** — incremented at txn create/update inside the same Dexie transaction.

### 4.4 First-launch seed

On first run (detected by missing `appMeta` row), the app inserts:

- 1 default account: `"Cash"`, type `cash`, currency `INR`, opening balance 0.
- 11 expense categories + 1 income category (see Appendix A — Wallet defaults plus India additions).
- 10 default payment methods (see Appendix B).
- 2 system tags pre-defined: `reimburse-pending`, `reimbursed`.
- `appMeta` row with defaults: `theme: 'system'`, `gpsEnabled: true`, `defaultTxKind: 'expense'`.

Then routes to Dashboard. No first-run wizard — keep friction at zero.

---

## 5. Screen flows

Four bottom-tab pages. Add-Transaction is a modal sheet, not a page.

### 5.1 Dashboard

Vertically stacked, scrollable:

1. **Time-range chip row** — `7d · This Month* · Last Month · Custom`. Persists in URL query (`?range=this-month`) so refresh keeps state.
2. **Net summary card** — three numbers for the chosen range: Income (green), Expense (red), Net (signed). Transfers excluded.
3. **Pending reimbursements chip** — only shown if any expense in range has tag `reimburse-pending`. Shows count + total. Tap → Transactions page filtered to that tag.
4. **Accounts strip** — horizontal scroll. Each card: icon, name, type chip, current balance, accent colour. Tap → Transactions filtered to that account.
5. **Spend-by-category donut** — Recharts donut with top 6 categories + "Others"; legend lists `₹amount (%)`. Tap a slice → drill to that category for the range.

### 5.2 Transactions

- **Sticky header**: search input, filter button, date-range chip (`Week · Month* · All · Custom`).
- **Filter sheet**: Account · Category → Subcategory · Tag · Payment method · Kind toggle. Multi-select where it makes sense.
- **List**: grouped by day. Row layout: icon (category colour) · title (`note`, else `category.name`) · subtitle (account · method · tag chips) · right-aligned signed amount (red expense, green income, gray transfer).
- **FAB**: floating "+" bottom-right above the tab bar.
- **Tap row** → detail sheet with all fields, image carousel, mini-map (if `placeId`), edit + delete buttons. **Long-press** → quick duplicate.

### 5.3 Add/Edit Transaction sheet

- **Step 1**: segmented control — `Expense* · Income · Transfer`.
- **Step 2**: form by kind (see table below). Date/time auto-fills to now; editable.

| Field | Expense | Income | Transfer |
|---|---|---|---|
| Amount (required) | ✓ | ✓ | ✓ |
| Date/time (auto-now, editable) | ✓ | ✓ | ✓ |
| From account (required) | ✓ | ✓ | ✓ |
| To account (required) | – | – | ✓ |
| Category → Subcategory | ✓ | ✓ | – |
| Note ("Details") | ✓ | ✓ | ✓ |
| Payment method | ✓ | ✓ | ✓ |
| Place (auto-GPS suggest + create) | ✓ | – | – |
| Tags (multi, autocomplete-or-create) | ✓ | ✓ | ✓ |
| Images (camera/gallery, multi) | ✓ | ✓ | – |

- **Office category auto-rule**: when user picks an Office category on an Expense, the app silently adds tag `reimburse-pending`. User can remove it.
- **Save button** sticky at sheet bottom. Cancel discards draft (form state ephemeral).

### 5.4 Accounts

- List of active accounts at top, archived collapsed at bottom.
- Row: icon · name · type chip · current balance.
- Tap → account detail (balance trendline + account-filtered txn list).
- **Top-right "+"**: form with name, type, optional bank name, currency (default INR), opening balance, colour, icon.
- **Long-press**: archive (soft, balances preserved). Hard-delete only if zero referencing transactions.

### 5.5 Settings

Grouped, iOS-style sections:

- **Profile** — name, base currency, default account, default tx kind, theme, GPS-on-by-default toggle.
- **Manage data** — Manage Categories (CRUD with subcategories) · Manage Tags · Manage Payment Methods · Manage Places. Each is a list with search + "+", swipe to edit/archive.
- **Backup & Restore** — Export backup (downloads `purse_backup_YYYY-MM-DD_HH-mm.json`, includes image base64) · Import (file picker, preview counts, merge-vs-replace toggle, refuses backups with newer `schemaVersion`).
- **About** — app version, schema version, last backup date, GitHub link.

### 5.6 Empty states

- **No transactions**: friendly illustration + "Add your first transaction" → opens sheet.
- **Search no-results**: "No transactions match. Clear filters?"
- **GPS unavailable**: no banner; the Place field just shows the manual input without suggestions.
- **Offline**: silent — everything works offline.

---

## 6. Storage layer

### 6.1 Two stores

| Store | What lives there | Why |
|---|---|---|
| Dexie (IndexedDB) | Every row in §4.1 schema | Indexed, queryable, transactional |
| OPFS | Image blobs (`txn/<uuid>/N.jpg` + `thumb_N.jpg`) | Better large-blob handling; less likely to be wiped by routine browser cleanup than IndexedDB blob storage |

### 6.2 Image pipeline

```
User taps "Add image"
  → <input type="file" accept="image/*" capture="environment" multiple>
  → For each file:
      • Decode via ImageBitmap
      • Resize to max 1600 px long edge, JPEG q=0.8 → main
      • Resize to 256 px square, JPEG q=0.7 → thumbnail
  → Write main as `txn/<uuid>/N.jpg`, thumb as `txn/<uuid>/thumb_N.jpg`
  → Push `"txn/<uuid>/N.jpg"` into `transaction.images[]`
```

Delete fires `await dir.removeEntry(uuid, { recursive: true })` before the Dexie row is removed.

### 6.3 Repository facade

Every page calls **`repo/*` functions only**. Dexie is hidden behind them.

```ts
// repo/transactions.ts
export const txRepo = {
  listByRange(start: Date, end: Date, filters?: TxFilters): Promise<Transaction[]>,
  get(id: string): Promise<Transaction | null>,
  create(input: CreateTxInput): Promise<Transaction>,
  update(id: string, patch: Partial<Transaction>): Promise<Transaction>,
  remove(id: string): Promise<void>,
  monthlyTotalsByCategory(monthISO: string): Promise<CategoryTotal[]>,
}
```

Today these wrap Dexie. To add cloud sync tomorrow, a single new `RemoteTxRepo` implementation can be slotted in — UI does not change. **This is the line that keeps "local-first" honest.**

### 6.4 Migrations & versioning

- Schema changes use Dexie's `db.version(N).upgrade(tx => …)` ladder.
- `appMeta.schemaVersion` lives in the database; bumped on each migration.
- Backup JSON carries `schemaVersion`. Import refuses backups with a *newer* version than the running build.

---

## 7. PWA, GPS, maps, offline

### 7.1 PWA basics

- `vite-plugin-pwa` generates `manifest.webmanifest`, icons (192/512/maskable), and service worker.
- `display: standalone`, `theme_color` from Tailwind primary, `background_color` matches splash.
- App shell precached at install; ~300 KB gzip bundle target.
- `registerType: 'autoUpdate'` + skip-waiting toast: *"New version available — refresh"*.
- Vercel headers (`vercel.json`):
  - `/index.html`, `/sw.js`, `/manifest.webmanifest` → `Cache-Control: no-cache`.
  - `/assets/*` (hashed) → `Cache-Control: public, max-age=31536000, immutable`.
  - `Permissions-Policy: geolocation=(self), camera=(self)`.

### 7.2 Geolocation flow

1. First open of Add-Transaction sheet → browser prompts once. Decision cached by browser.
2. If granted: silent `getCurrentPosition({ maximumAge: 60_000, timeout: 5_000 })` at sheet open. Held in form state.
3. **Place picker logic** in Expense form:
   - Compute Haversine distance to every saved Place.
   - Show up to 5 places within 200 m, sorted by distance + recency tie-breaker.
   - Below suggestions: text input. Typing a new name → "**+ Create place here**" button appears, saves with current lat/lng.
   - GPS denied/unavailable: input alone, no GPS attached, no suggestions.
4. **Settings → `gpsEnabled = false`** disables the auto-prompt and silent fetch globally; user can still create places by typing.

### 7.3 Maps

- Leaflet + OSM tiles (attribution shown; no API key).
- Two views:
  - Txn detail sheet: small static map at 130 px height centred on `placeId`.
  - Settings → Manage Places: full-screen map with all pins; tap a pin opens the place's recent transactions.
- Tiles are not precached (would cost hundreds of MB). On offline the map silently goes grey; coordinates still display as text.

### 7.4 Camera / gallery

- Single `<input>` element with `accept="image/*" capture="environment" multiple` — browser shows native picker with camera + gallery.
- Compression handled client-side (§6.2).

---

## 8. Testing strategy

A small pyramid weighted to fast tests at the bottom.

### 8.1 Tooling

| Layer | Tool |
|---|---|
| Unit (logic / repo) | Vitest + `fake-indexeddb` |
| Component | Vitest + React Testing Library (`jsdom`) |
| End-to-end | Playwright (real Chromium) |

### 8.2 Layer 1 — Repository (highest value)

Target ~90% line coverage on `repo/*`.

```
repo/transactions.test.ts
  ✓ create() inserts with computed createdAt/updatedAt
  ✓ listByRange() is inclusive on start, exclusive on end
  ✓ monthlyTotalsByCategory() excludes transfers
  ✓ update() bumps updatedAt and preserves immutable id
  ✓ remove() cascades OPFS image cleanup

repo/balances.test.ts
  ✓ balance = openingBalance + Σincome + ΣtransferIn − Σexpense − ΣtransferOut
  ✓ archived account still computes correctly
  ✓ recomputes after each mutation

repo/tags.test.ts
  ✓ create-or-find is case-insensitive
  ✓ usageCount increments inside same Dexie tx
```

### 8.3 Layer 2 — Components

Behaviour-focused. A small but high-leverage set:

- `<AddTransactionSheet>` — kind switch swaps fields; required-field validation; save closes sheet and emits row.
- `<DashboardDonut>` — empty state; top-6 + Others bucketing; tap a slice navigates correctly.
- `<TransactionList>` — filter sheet narrows results; search debounces (300 ms).
- `<PlacePicker>` — suggests places within 200 m; create-new-place button saves with current GPS.

### 8.4 Layer 3 — End-to-end (Playwright, ~5 tests)

1. First-run → seeded categories present.
2. Add an expense with GPS + 1 image → appears in list, Dashboard donut updates.
3. Edit transaction → Dashboard reflects change.
4. Add transfer → not counted in Expense total.
5. Export backup → re-import on a clean profile → identical state (counts + image SHA match).

### 8.5 Manual smoke checklist

A one-pager `docs/smoke.md` run before each release tag:

- Install on Android Chrome via "Add to Home Screen".
- Open offline → app loads.
- Take photo with rear camera; gallery pick; both attach.
- Deny GPS → add transaction with manual place.
- Kill app, reopen → data persists.
- Export, wipe data via Settings, re-import → all data back including images.

### 8.6 CI

GitHub Actions on push to `main` and on every PR:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck` (`tsc --noEmit`)
4. `npm run test` (Vitest)
5. `npm run test:e2e` (Playwright; cached browsers)
6. `npm run build`

A failing step blocks Vercel deploy (Vercel waits on the GitHub commit status).

---

## 9. Deployment

### 9.1 Vercel setup

- Connect `subramanyaSgb/Purse` in Vercel dashboard.
- Framework preset auto-detected as Vite.
- Production branch: `main`. Preview deploys for every other branch and PR.
- No environment variables.

### 9.2 `vercel.json`

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/sw.js",                "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/index.html",           "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/manifest.webmanifest", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Permissions-Policy", "value": "geolocation=(self), camera=(self)" }
      ]
    }
  ]
}
```

### 9.3 First-deploy bootstrap

```bash
cd Tracker/
git init
git add .
git commit -m "feat: scaffold Purse PWA"
git branch -M main
git remote add origin https://github.com/subramanyaSgb/Purse.git
git push -u origin main
```

Then in the Vercel dashboard: New Project → Import `subramanyaSgb/Purse` → Deploy.

### 9.4 Custom domain (later)

Add via Vercel → Domains. No code change required.

---

## Appendix A — Seeded categories (Wallet defaults + India additions)

All categories are nested (Category → Subcategory). Icons (lucide) and colours assigned at seed time. All entries are editable and deletable from Settings → Manage Categories.

### Expense

| Category | Subcategories |
|---|---|
| 🍽️ **Food & Drinks** | Bar/café · Groceries · Restaurant · Fast food |
| 🛍️ **Shopping** | Clothes & shoes · Drugstore/chemist · Electronics & accessories · Free time · Gifts & joy · Health & beauty · Home & garden · Jewels & accessories · Kids · Pets/animals · Stationery/tools |
| 🏠 **Housing** | Energy & utilities · Maintenance & repairs · Mortgage · Property insurance · Rent · Services |
| 🚌 **Transportation** | Business trips · Long distance · Public transport · Taxi |
| 🚗 **Vehicle** | Fuel · Leasing · Parking · Rentals · Vehicle insurance · Vehicle maintenance |
| 🎭 **Life & Entertainment** | Active sport & fitness · Alcohol & tobacco · Books, audio, subscriptions · Charity & gifts · Culture & sport events · Education & development · Healthcare & doctor · Hobbies · Holiday, trips, hotels · Life events · Lottery, gambling · TV, Streaming · Wellness & beauty |
| 📱 **Communication, PC** | Internet · Phone, cell phone · Postal services · Software, apps, games |
| 💸 **Financial expenses** | Advisory · Charges & fees · Child support · Fines · Insurances · Loan, interests · Taxes |
| 📈 **Investments** *(expense kind)* | Collections · Financial investments · Realty · Savings · Vehicles, chattels |
| 🛕 **Temple** *(India)* | General · Donation · Prasadam · Kalyanostsawam |
| 🏢 **Office** *(India, work-related)* | Travel · Food · Hardware · Other |
| 👨‍👩‍👧 **Family Support** *(India)* | Mom · Dad · Sister · Wife · Other |

### Income

| Category | Subcategories |
|---|---|
| 💰 **Income** | Checks, coupons · Child support · Dues & grants · Gifts · Interests, dividends · Lending, renting · Lottery, gambling · Refunds (tax, purchase) · Rental income · Sale · Wage, invoices |
| 💸 **Cashback & Interest** *(India-flavoured)* | UPI Rewards · Bank Interest · App Cashback |

### Other

| Category | Subcategories |
|---|---|
| ❓ **Others** | Other |

---

## Appendix B — Seeded payment methods

| Name | Kind |
|---|---|
| PhonePe | upi |
| Google Pay | upi |
| BHIM | upi |
| Paytm | upi |
| Bank App | netbanking |
| Card | card |
| NetBanking | netbanking |
| Cash | cash |
| CRED | wallet |
| Other | other |

---

## Appendix C — Decisions log

A condensed record of the brainstorming session. Useful when re-reading later.

| # | Question | Decision |
|---|---|---|
| Q1 | Scope vs full Wallet parity | Strip-down MVP, iterate based on use |
| Q2 | Category structure | Nested (Wallet-style, Category → Subcategory) |
| Q3 | Place / GPS handling | Auto-GPS capture + reusable saved places + nearby suggest |
| Q4 | Image attachments | Multi-image, camera/gallery, auto-resize 1600 px, OPFS storage |
| Q5 | Tech stack | React + Vite + TS + Dexie + Tailwind + shadcn/ui |
| Audit 1 | Manage Categories in Settings | Yes |
| Audit 2 | Nested categories | Yes (overrode my flat suggestion) |
| Audit 3 | Party/People concept | Dropped for MVP |
| Audit 4 | Tags vs Categories | Tags = free-form cross-cut, multi per txn, auto-create |
| Audit 5 | Settings page contents | Profile + Manage data + Backup + About |
| Audit 6 | Dashboard default range | Current month |
| Extra | Payment method tracking | New `paymentMethods` table; optional per txn |
| First-run | Seed strategy | Fresh start only; Wallet defaults + India additions; no Paisa import |
| Office workflow | How to track reimbursements | Tag-based (`reimburse-pending` / `reimbursed`) + Dashboard chip |
| Family Support | New category for sending money home | Yes, top-level expense category with family-member subs |
| Naming | App name | **Purse** |
| Hosting | Deployment target | Vercel from GitHub (`subramanyaSgb/Purse`) |

---

## Appendix D — Glossary

- **PWA** — Progressive Web App. Installable to the home screen, works offline, served over HTTPS.
- **OPFS** — Origin Private File System. Browser API for storing private files; more reliable for blobs than IndexedDB's `Blob` cells.
- **Dexie** — A TypeScript-friendly wrapper around IndexedDB.
- **Repository facade** — A small set of functions that hide the storage backend from the UI, making it swappable later.
- **shadcn/ui** — Copy-into-your-repo React components built on Radix + Tailwind.
- **Local-first** — Application architecture where the device is the source of truth and the network is optional.
