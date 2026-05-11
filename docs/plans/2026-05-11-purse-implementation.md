# Purse Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
> **REQUIRED:** Read `docs/plans/2026-05-11-purse-design.md` first — it is the canonical reference for _what_ to build. This document covers _how_.
> **TDD:** Use `@superpowers:test-driven-development` for every task that touches `repo/*` or domain logic. UI components without testable behaviour can skip the test step but must still pass typecheck and lint.
> **Verification:** Use `@superpowers:verification-before-completion` — never mark a task done without running the commands and seeing the output.

**Goal:** Build a local-first personal finance PWA called Purse, matching the locked design doc, deployable to Vercel from GitHub.

**Architecture:** Pure client-side React+Vite SPA. Repository facade hides Dexie (IndexedDB) from the UI so cloud sync can be added later without UI changes. Images live in OPFS, not IndexedDB. PWA via `vite-plugin-pwa`.

**Tech Stack:** React 18 · Vite · TypeScript (strict) · React Router · Dexie 4 · OPFS · Tailwind · shadcn/ui · Recharts · Leaflet · `vite-plugin-pwa` · Vitest + fake-indexeddb · Playwright · Vercel · GitHub Actions.

**Working directory:** `c:\Users\DSI-LPT-081\Desktop\SubramanyaGB\Test_Projects\Tracker\` (folder name stays "Tracker" while the repo and app are called "Purse"). All paths below are relative to this.

---

## Table of contents

- [Phase 0 — Bootstrap (12 tasks)](#phase-0--bootstrap)
- [Phase 1 — Data layer (16 tasks)](#phase-1--data-layer)
- [Phase 2 — App shell (7 tasks)](#phase-2--app-shell)
- [Phase 3 — Settings page (11 tasks)](#phase-3--settings-page)
- [Phase 4 — Transactions page (16 tasks)](#phase-4--transactions-page)
- [Phase 5 — Dashboard (5 tasks)](#phase-5--dashboard)
- [Phase 6 — PWA polish (5 tasks)](#phase-6--pwa-polish)
- [Phase 7 — End-to-end tests (5 tasks)](#phase-7--end-to-end-tests)
- [Phase 8 — Deploy (3 tasks)](#phase-8--deploy)

**Commit cadence:** every task ends with a commit. **Never** combine two tasks into one commit.

**Commit message style:** Conventional Commits — `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`. Subject ≤ 72 chars. Body wraps at 80. Sign every commit with the standard Claude co-author footer.

---

## Phase 0 — Bootstrap

Twelve tasks. After this phase the repo is on GitHub, the toolchain is installed, and `npm run build && npm run test` both pass on an empty app. No app code yet.

### Task 0.1 — Initialize git and the Vite TypeScript scaffold

**Files (created by Vite):** the entire scaffold under `Tracker/`.

**Step 1 — Confirm working directory is empty (apart from the existing files).**

Run: `ls -la`
Expected: see `docs/`, `paisa_backup_v_2026.04.302_2026_May_06_11_53.json`, nothing else.

**Step 2 — Create the Vite scaffold _in-place_.**

Vite refuses to scaffold into a non-empty directory, so use the npm 7+ trick: scaffold into a temp folder then move.

```bash
# from the working directory
npm create vite@latest .purse-tmp -- --template react-ts
mv .purse-tmp/* .purse-tmp/.* . 2>/dev/null
rmdir .purse-tmp
```

If `mv` complains about `.` and `..`, just ignore those — they won't move.

**Step 3 — Initialize git.**

```bash
git init
git branch -M main
```

**Step 4 — Stage the gitignore and verify it covers `node_modules`, `dist`, `.env*`, `*.log`.**

Run: `cat .gitignore`
Expected: contains at least those four patterns.

**Step 5 — Install dependencies.**

```bash
npm install
```

**Step 6 — Smoke-test the scaffold.**

```bash
npm run build
```

Expected: builds without errors. `dist/index.html` exists.

**Step 7 — Commit.**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS"
```

---

### Task 0.2 — Strict TypeScript + path alias

**Files:**

- Modify: `tsconfig.json`
- Modify: `tsconfig.node.json` (only if needed)
- Modify: `vite.config.ts`

**Step 1 — Edit `tsconfig.json` to add strict + path alias.**

Set `compilerOptions`:

- `"strict": true` (should already be)
- `"noUnusedLocals": true`
- `"noUnusedParameters": true`
- `"noImplicitOverride": true`
- `"noFallthroughCasesInSwitch": true`
- `"baseUrl": "."`
- `"paths": { "@/*": ["src/*"] }`

**Step 2 — Edit `vite.config.ts` to match the alias.**

```ts
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

**Step 3 — Verify the alias works.**

In `src/App.tsx`, change `import './App.css'` to `import '@/App.css'` (just to test the alias). Run `npm run build`. Expected: builds.

**Step 4 — Add a `typecheck` npm script.**

In `package.json`, add to `"scripts"`:

```json
"typecheck": "tsc --noEmit"
```

Run: `npm run typecheck`
Expected: exits 0.

**Step 5 — Commit.**

```bash
git add -A
git commit -m "chore: strict tsconfig + @/* path alias"
```

---

### Task 0.3 — ESLint + Prettier

**Files:**

- Create: `.eslintrc.cjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Modify: `package.json` (scripts + devDeps)

**Step 1 — Install dev dependencies.**

```bash
npm i -D \
  eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
  eslint-config-prettier prettier
```

**Step 2 — Write `.eslintrc.cjs`:**

```js
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', 'playwright-report'],
};
```

**Step 3 — Write `.prettierrc.json`:**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Step 4 — Add npm scripts to `package.json`:**

```json
"lint": "eslint . --ext .ts,.tsx --max-warnings 0",
"lint:fix": "eslint . --ext .ts,.tsx --fix",
"format": "prettier --write \"src/**/*.{ts,tsx,css,md}\""
```

**Step 5 — Run `npm run lint`.**

Expected: passes (zero warnings) or shows trivial issues fixable with `--fix`. Run `npm run lint:fix` then re-run `lint`. Must pass.

**Step 6 — Commit.**

```bash
git add -A
git commit -m "chore: add eslint + prettier with strict config"
```

---

### Task 0.4 — Tailwind CSS + base styles

**Files:**

- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Modify: `src/index.css`

**Step 1 — Install Tailwind + PostCSS.**

```bash
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

This creates `tailwind.config.js` and `postcss.config.js`. Rename `tailwind.config.js` → `tailwind.config.ts` and convert syntax.

**Step 2 — Write `tailwind.config.ts`:**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn-compatible CSS variable colours; filled in Task 0.5
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: 'hsl(var(--primary) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Step 3 — Replace `src/index.css` with Tailwind directives + base reset.**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 4%;
    --primary: 222 47% 11%;
    --muted: 240 5% 96%;
    --border: 240 6% 90%;
  }
  .dark {
    --background: 240 10% 4%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --muted: 240 4% 16%;
    --border: 240 4% 16%;
  }
  html,
  body,
  #root {
    height: 100%;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

**Step 4 — Strip the boilerplate logos from `src/App.tsx`:** replace its content with a minimal placeholder that uses a Tailwind class so we can prove the pipeline works.

```tsx
export default function App() {
  return (
    <div className="grid h-full place-items-center text-2xl font-semibold">
      Purse — under construction
    </div>
  );
}
```

Delete `src/App.css`.

**Step 5 — Build to verify.**

```bash
npm run dev
```

Open the printed URL. Expected: centred "Purse — under construction" on a clean page. Kill the dev server.

**Step 6 — Commit.**

```bash
git add -A
git commit -m "feat: install tailwind with shadcn-ready CSS variables"
```

---

### Task 0.5 — shadcn/ui scaffolding

**Files:**

- Create: `components.json`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx` (smoke test only)

**Step 1 — Install shadcn CLI dependencies.**

```bash
npm i class-variance-authority clsx tailwind-merge lucide-react
npm i -D @types/node
```

**Step 2 — Create `src/lib/utils.ts`:**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 3 — Create `components.json` at the repo root** (shadcn config):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Step 4 — Add a Button via the CLI** (smoke test that the integration works).

```bash
npx shadcn@latest add button
```

Confirm the prompts. Expected: `src/components/ui/button.tsx` is created.

**Step 5 — Wire the button into `App.tsx`** to prove the styling chain works.

```tsx
import { Button } from '@/components/ui/button';

export default function App() {
  return (
    <div className="grid h-full place-items-center">
      <Button>Hello Purse</Button>
    </div>
  );
}
```

`npm run dev`, confirm a styled button renders. Kill dev server.

**Step 6 — Commit.**

```bash
git add -A
git commit -m "feat: configure shadcn/ui and add Button primitive"
```

---

### Task 0.6 — Vitest + fake-indexeddb test setup

**Files:**

- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/smoke.test.ts`
- Modify: `package.json` (scripts + devDeps)

**Step 1 — Install testing dependencies.**

```bash
npm i -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb
```

**Step 2 — Write `vitest.config.ts`:**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}', 'src/main.tsx'],
    },
  },
});
```

**Step 3 — Write `src/test/setup.ts`:**

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

**Step 4 — Write the smoke test `src/test/smoke.test.ts`:**

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });

  it('has fake-indexeddb available', () => {
    expect(typeof indexedDB).toBe('object');
  });
});
```

**Step 5 — Add npm scripts:**

```json
"test": "vitest run",
"test:watch": "vitest",
"test:cov": "vitest run --coverage"
```

**Step 6 — Run the test.**

```bash
npm run test
```

Expected: 2 passed.

**Step 7 — Commit.**

```bash
git add -A
git commit -m "test: configure vitest with fake-indexeddb"
```

---

### Task 0.7 — Playwright skeleton

**Files:**

- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`
- Modify: `package.json` (scripts + devDeps + `.gitignore`)
- Modify: `.gitignore` (add `playwright-report/`, `test-results/`)

**Step 1 — Install Playwright.**

```bash
npm i -D @playwright/test
npx playwright install --with-deps chromium
```

**Step 2 — Write `playwright.config.ts`:**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

**Step 3 — Write `e2e/smoke.spec.ts`:**

```ts
import { test, expect } from '@playwright/test';

test('app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Purse')).toBeVisible();
});
```

**Step 4 — Add to `.gitignore`:**

```
playwright-report/
test-results/
```

**Step 5 — Add npm script:**

```json
"test:e2e": "playwright test"
```

**Step 6 — Build, then run e2e.**

```bash
npm run build
npm run test:e2e
```

Expected: 1 passed.

**Step 7 — Commit.**

```bash
git add -A
git commit -m "test: add Playwright with one smoke spec"
```

---

### Task 0.8 — Routing + base layout placeholder

**Files:**

- Create: `src/routes/Root.tsx`
- Create: `src/routes/DashboardPage.tsx`
- Create: `src/routes/TransactionsPage.tsx`
- Create: `src/routes/AccountsPage.tsx`
- Create: `src/routes/SettingsPage.tsx`
- Create: `src/main.tsx` (modify existing)

**Step 1 — Install React Router.**

```bash
npm i react-router-dom
```

**Step 2 — Create each route stub.** Each is a minimal page returning its own name in a `<h1>`. Example `src/routes/DashboardPage.tsx`:

```tsx
export default function DashboardPage() {
  return <h1 className="p-4 text-xl font-semibold">Dashboard</h1>;
}
```

Do the same for `TransactionsPage`, `AccountsPage`, `SettingsPage`.

**Step 3 — Create `src/routes/Root.tsx`** with `<Outlet />` and a tab bar placeholder:

```tsx
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/settings', label: 'Settings' },
];

export default function Root() {
  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 grid h-16 grid-cols-4 border-t bg-background">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center text-sm',
                isActive ? 'text-primary font-medium' : 'text-muted-foreground',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
```

**Step 4 — Replace `src/main.tsx` with the router setup:**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Root from '@/routes/Root';
import DashboardPage from '@/routes/DashboardPage';
import TransactionsPage from '@/routes/TransactionsPage';
import AccountsPage from '@/routes/AccountsPage';
import SettingsPage from '@/routes/SettingsPage';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
```

Delete the now-unused `src/App.tsx` (or trim it). Update e2e smoke spec to look for "Dashboard" instead of "Purse".

**Step 5 — Run lint + typecheck + test + build.**

```bash
npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e
```

Expected: all pass.

**Step 6 — Commit.**

```bash
git add -A
git commit -m "feat: add router + 4 page stubs + bottom tab bar"
```

---

### Task 0.9 — `vite-plugin-pwa` config

**Files:**

- Modify: `vite.config.ts`
- Create: `public/icon-192.svg` and `public/icon-512.svg` (placeholder SVGs; final art in Phase 6)

**Step 1 — Install.**

```bash
npm i -D vite-plugin-pwa
```

**Step 2 — Add placeholder icons.** Create `public/icon-192.svg` and `public/icon-512.svg`. Either content:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 7H3a1 1 0 0 0-1 1v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1Zm-3 7h-2a1 1 0 1 1 0-2h2a1 1 0 1 1 0 2ZM5 5h13a1 1 0 0 1 1 1H4a1 1 0 0 1 1-1Z"/></svg>
```

(We'll PNG-rasterise later — SVG icons are valid in modern PWA manifests.)

**Step 3 — Update `vite.config.ts`:**

```ts
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'Purse',
        short_name: 'Purse',
        description: 'Local-first personal finance tracker.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'] },
      devOptions: { enabled: false }, // keep dev simple; manifest available in preview/prod
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

**Step 4 — Build and verify the manifest exists.**

```bash
npm run build
ls dist/manifest.webmanifest dist/sw.js
```

Expected: both files exist.

**Step 5 — Commit.**

```bash
git add -A
git commit -m "feat: configure vite-plugin-pwa with placeholder icons"
```

---

### Task 0.10 — `vercel.json` + GitHub Actions CI

**Files:**

- Create: `vercel.json`
- Create: `.github/workflows/ci.yml`

**Step 1 — Create `vercel.json`:**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    {
      "source": "/manifest.webmanifest",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    },
    {
      "source": "/(.*)",
      "headers": [{ "key": "Permissions-Policy", "value": "geolocation=(self), camera=(self)" }]
    }
  ]
}
```

**Step 2 — Create `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          CI: 'true'
```

**Step 3 — Commit.**

```bash
git add -A
git commit -m "ci: add vercel.json and GitHub Actions workflow"
```

---

### Task 0.11 — README

**Files:** Create `README.md`.

**Step 1 — Write `README.md`:**

````markdown
# Purse

A local-first personal finance PWA. Your money data lives on your device, not on a server.

## Run locally

```bash
npm install
npm run dev
```
````

## Build

```bash
npm run build
npm run preview
```

## Test

```bash
npm run test       # vitest unit + component
npm run test:e2e   # playwright end-to-end
```

## Stack

React · Vite · TypeScript · Dexie (IndexedDB) · OPFS · Tailwind · shadcn/ui · vite-plugin-pwa · Recharts · Leaflet · Vitest · Playwright.

See [docs/plans/2026-05-11-purse-design.md](docs/plans/2026-05-11-purse-design.md) for the canonical design.

````

**Step 2 — Commit.**

```bash
git add README.md
git commit -m "docs: add README"
````

---

### Task 0.12 — Push to GitHub

**Step 1 — Connect remote.**

```bash
git remote add origin https://github.com/subramanyaSgb/Purse.git
git push -u origin main
```

If authentication fails, configure a PAT or SSH key first — outside this plan's scope.

**Step 2 — Verify on GitHub.**

Open `https://github.com/subramanyaSgb/Purse` in the browser. Expected: see the files. CI workflow should auto-run; it must pass.

**Step 3 — Connect Vercel** (one-time, manual in Vercel dashboard): New Project → Import `subramanyaSgb/Purse` → leave framework auto-detected (Vite) → Deploy. The first deploy will succeed and show the placeholder page.

**Step 4 — No commit needed; phase 0 done.**

---

## Phase 1 — Data layer

Sixteen tasks, all TDD. After this phase the repository facade is complete and ~90% covered. No UI yet. Every task: failing test first, minimal impl, verify pass, commit.

> **Required reading before starting:** `@superpowers:test-driven-development`.

### Task 1.1 — Domain types

**Files:**

- Create: `src/domain/types.ts`

**No tests** — pure type declarations.

**Step 1 — Write `src/domain/types.ts`** (mirror §4.1 of the design doc):

```ts
export type ID = string; // UUID v4
export type ISODate = string; // ISO 8601 with milliseconds

export type AccountType = 'cash' | 'bank' | 'card' | 'wallet' | 'savings' | 'rd' | 'asset';
export type CategoryKind = 'expense' | 'income';
export type TxKind = 'expense' | 'income' | 'transfer';
export type PaymentMethodKind = 'upi' | 'card' | 'cash' | 'netbanking' | 'wallet' | 'other';
export type Theme = 'light' | 'dark' | 'system';

export interface Account {
  id: ID;
  name: string;
  type: AccountType;
  bankName?: string;
  currency: string;
  openingBalance: number;
  colour: string;
  icon: string;
  archivedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Category {
  id: ID;
  name: string;
  kind: CategoryKind;
  colour: string;
  icon: string;
  archivedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Subcategory {
  id: ID;
  categoryId: ID;
  name: string;
  icon: string;
  archivedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Tag {
  id: ID;
  name: string;
  nameLower: string;
  usageCount: number;
  lastUsedAt: ISODate | null;
}

export interface Place {
  id: ID;
  name: string;
  lat: number;
  lng: number;
  addressCached: string | null;
  lastUsedAt: ISODate | null;
  createdAt: ISODate;
}

export interface PaymentMethod {
  id: ID;
  name: string;
  kind: PaymentMethodKind;
  icon: string;
  colour: string;
  archivedAt: ISODate | null;
}

export interface Transaction {
  id: ID;
  kind: TxKind;
  amount: number;
  currency: string;
  occurredAt: ISODate;
  accountId: ID;
  toAccountId?: ID;
  categoryId?: ID;
  subcategoryId?: ID;
  placeId?: ID;
  paymentMethodId?: ID;
  note: string;
  tagIds: ID[];
  images: string[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AppMeta {
  id: 'singleton';
  userName: string;
  baseCurrency: string;
  defaultAccountId?: ID;
  defaultTxKind: TxKind;
  theme: Theme;
  gpsEnabled: boolean;
  schemaVersion: number;
  appVersion: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}
```

**Step 2 — Typecheck.**

```bash
npm run typecheck
```

**Step 3 — Commit.**

```bash
git add src/domain/types.ts
git commit -m "feat: define domain types for Purse"
```

---

### Task 1.2 — UUID + ISO timestamp helpers

**Files:**

- Create: `src/lib/ids.ts`
- Create: `src/lib/ids.test.ts`

**Step 1 — Write the failing test.**

```ts
// src/lib/ids.test.ts
import { describe, it, expect } from 'vitest';
import { newId, nowIso } from './ids';

describe('ids', () => {
  it('newId returns a v4 uuid', () => {
    const id = newId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('newId returns unique ids', () => {
    const a = newId(),
      b = newId();
    expect(a).not.toBe(b);
  });

  it('nowIso returns an ISO 8601 timestamp', () => {
    const ts = nowIso();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(ts).toISOString()).toBe(ts);
  });
});
```

**Step 2 — Run, verify fail.**

```bash
npm run test -- src/lib/ids.test.ts
```

Expected: FAIL (module not found).

**Step 3 — Implement.**

```ts
// src/lib/ids.ts
export const newId = (): string => crypto.randomUUID();
export const nowIso = (): string => new Date().toISOString();
```

**Step 4 — Run, verify pass.**

```bash
npm run test -- src/lib/ids.test.ts
```

Expected: 3 passed.

**Step 5 — Commit.**

```bash
git add -A
git commit -m "feat(lib): newId + nowIso helpers with tests"
```

---

### Task 1.3 — Dexie schema

**Files:**

- Create: `src/db/db.ts`
- Create: `src/db/db.test.ts`

**Step 1 — Install Dexie.**

```bash
npm i dexie dexie-react-hooks
```

**Step 2 — Write the failing test.**

```ts
// src/db/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';

describe('db', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('has all expected tables', () => {
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'accounts',
        'appMeta',
        'categories',
        'paymentMethods',
        'places',
        'subcategories',
        'tags',
        'transactions',
      ].sort(),
    );
  });

  it('persists and retrieves an account', async () => {
    await db.accounts.put({
      id: 'a1',
      name: 'Cash',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'wallet',
      archivedAt: null,
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
    });
    const a = await db.accounts.get('a1');
    expect(a?.name).toBe('Cash');
  });
});
```

**Step 3 — Implement `src/db/db.ts`:**

```ts
import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Category,
  Subcategory,
  Tag,
  Place,
  PaymentMethod,
  Transaction,
  AppMeta,
} from '@/domain/types';

export class PurseDB extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  subcategories!: Table<Subcategory, string>;
  tags!: Table<Tag, string>;
  places!: Table<Place, string>;
  paymentMethods!: Table<PaymentMethod, string>;
  transactions!: Table<Transaction, string>;
  appMeta!: Table<AppMeta, string>;

  constructor() {
    super('purse');
    this.version(1).stores({
      accounts: 'id, name, type, archivedAt',
      categories: 'id, name, kind, archivedAt',
      subcategories: 'id, categoryId, name, archivedAt',
      tags: 'id, &nameLower, lastUsedAt',
      places: 'id, name, lastUsedAt',
      paymentMethods: 'id, name, kind, archivedAt',
      transactions:
        'id, occurredAt, accountId, toAccountId, categoryId, subcategoryId, placeId, paymentMethodId, *tagIds, kind, [kind+occurredAt], [accountId+occurredAt]',
      appMeta: 'id',
    });
  }
}

export const db = new PurseDB();
```

**Step 4 — Run, verify pass.**

```bash
npm run test -- src/db/db.test.ts
```

Expected: 2 passed.

**Step 5 — Commit.**

```bash
git add -A
git commit -m "feat(db): Dexie schema for Purse (v1)"
```

---

### Task 1.4 — `accountsRepo` with tests

**Files:**

- Create: `src/repo/accounts.ts`
- Create: `src/repo/accounts.test.ts`

**Step 1 — Write the failing tests** (full suite up front; matches TDD by feature batch — acceptable for repo tasks where contracts are stable):

```ts
// src/repo/accounts.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { accountsRepo } from './accounts';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('accountsRepo', () => {
  it('create() inserts with generated id and timestamps', async () => {
    const a = await accountsRepo.create({
      name: 'Cash',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#0f172a',
      icon: 'wallet',
    });
    expect(a.id).toHaveLength(36);
    expect(a.createdAt).toEqual(a.updatedAt);
    expect(a.archivedAt).toBeNull();
  });

  it('list() returns non-archived accounts by default', async () => {
    await accountsRepo.create({
      name: 'A',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    const b = await accountsRepo.create({
      name: 'B',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    await accountsRepo.archive(b.id);
    const list = await accountsRepo.list();
    expect(list.map((x) => x.name)).toEqual(['A']);
  });

  it('list({ includeArchived: true }) returns all', async () => {
    await accountsRepo.create({
      name: 'A',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    const b = await accountsRepo.create({
      name: 'B',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    await accountsRepo.archive(b.id);
    const list = await accountsRepo.list({ includeArchived: true });
    expect(list).toHaveLength(2);
  });

  it('update() bumps updatedAt, preserves id', async () => {
    const a = await accountsRepo.create({
      name: 'A',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    await new Promise((r) => setTimeout(r, 5));
    const u = await accountsRepo.update(a.id, { name: 'A2' });
    expect(u.id).toBe(a.id);
    expect(u.name).toBe('A2');
    expect(u.updatedAt > a.updatedAt).toBe(true);
  });

  it('remove() hard-deletes if no transactions reference it', async () => {
    const a = await accountsRepo.create({
      name: 'A',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    await accountsRepo.remove(a.id);
    expect(await accountsRepo.get(a.id)).toBeNull();
  });
});
```

**Step 2 — Run, verify fail.**

```bash
npm run test -- src/repo/accounts.test.ts
```

Expected: FAIL (module not found).

**Step 3 — Implement `src/repo/accounts.ts`:**

```ts
import { db } from '@/db/db';
import { newId, nowIso } from '@/lib/ids';
import type { Account } from '@/domain/types';

export type CreateAccountInput = Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>;

export const accountsRepo = {
  async get(id: string): Promise<Account | null> {
    return (await db.accounts.get(id)) ?? null;
  },
  async list(opts: { includeArchived?: boolean } = {}): Promise<Account[]> {
    const all = await db.accounts.toArray();
    const filtered = opts.includeArchived ? all : all.filter((a) => a.archivedAt === null);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },
  async create(input: CreateAccountInput): Promise<Account> {
    const now = nowIso();
    const acc: Account = {
      ...input,
      id: newId(),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.accounts.add(acc);
    return acc;
  },
  async update(id: string, patch: Partial<Omit<Account, 'id' | 'createdAt'>>): Promise<Account> {
    const existing = await db.accounts.get(id);
    if (!existing) throw new Error(`Account ${id} not found`);
    const updated: Account = { ...existing, ...patch, updatedAt: nowIso() };
    await db.accounts.put(updated);
    return updated;
  },
  async archive(id: string): Promise<void> {
    await this.update(id, { archivedAt: nowIso() });
  },
  async unarchive(id: string): Promise<void> {
    await this.update(id, { archivedAt: null });
  },
  async remove(id: string): Promise<void> {
    const refs = await db.transactions
      .where('accountId')
      .equals(id)
      .or('toAccountId')
      .equals(id)
      .count();
    if (refs > 0) throw new Error('Account has transactions; archive instead');
    await db.accounts.delete(id);
  },
};
```

**Step 4 — Run, verify pass.**

```bash
npm run test -- src/repo/accounts.test.ts
```

Expected: 5 passed.

**Step 5 — Commit.**

```bash
git add -A
git commit -m "feat(repo): accountsRepo with create/list/update/archive/remove"
```

---

### Task 1.5 — `categoriesRepo`

Same pattern as 1.4 but for the `categories` table. Tests cover: `create`, `list` filtered by `kind`, `update`, `archive`, `remove` only if no subcategories or transactions reference it.

> **Detail level note:** Tasks 1.5 through 1.9 follow the same shape as 1.4: write the tests file mirroring the contract, run-fail, implement the repo module, run-pass, commit. Use the same naming and method signatures (`get`, `list`, `create`, `update`, `archive`, `unarchive`, `remove`) for consistency. Add type-specific listings where needed (e.g. `categoriesRepo.list({ kind: 'expense' })`).

**Commit message:** `feat(repo): categoriesRepo with create/list/update/archive/remove`

---

### Task 1.6 — `subcategoriesRepo`

`list({ categoryId })` filters by parent. `remove` blocked if transactions reference it. Cascade: archiving a category does **not** archive its subcategories automatically (explicit choice — user might un-archive parent later).

**Commit:** `feat(repo): subcategoriesRepo`

---

### Task 1.7 — `tagsRepo` with case-insensitive uniqueness

**Key tests:**

```ts
it('create() lowercases nameLower', async () => {
  const t = await tagsRepo.create({ name: 'Food' });
  expect(t.nameLower).toBe('food');
});

it('findOrCreate() returns existing tag when nameLower matches, case-insensitive', async () => {
  const a = await tagsRepo.findOrCreate('Food');
  const b = await tagsRepo.findOrCreate('FOOD');
  expect(a.id).toBe(b.id);
});

it('findOrCreate() bumps usageCount and lastUsedAt', async () => {
  const a = await tagsRepo.findOrCreate('Food');
  await new Promise((r) => setTimeout(r, 5));
  const b = await tagsRepo.findOrCreate('food');
  expect(b.usageCount).toBe(2);
  expect(b.lastUsedAt && b.lastUsedAt > (a.lastUsedAt ?? '')).toBe(true);
});

it('list() sorts by usageCount desc then name asc', async () => {
  /* ... */
});
```

**Implementation note:** `nameLower` has a `&` (unique) index in Dexie. `findOrCreate` uses `db.tags.where('nameLower').equalsIgnoreCase(...)` or just `equals(name.toLowerCase())` since we already lowercase on write.

**Commit:** `feat(repo): tagsRepo with case-insensitive findOrCreate`

---

### Task 1.8 — `placesRepo`

Methods: `get`, `list` (sorted by `lastUsedAt` desc), `create` (with lat/lng/name), `update`, `remove` (only if no transactions reference it), `touchLastUsed(id)`.

Add a Haversine helper `src/lib/geo.ts` + test (small triangle of known points; tolerance ±5 m).

**Commit (Haversine):** `feat(lib): Haversine distance helper`
**Commit (repo):** `feat(repo): placesRepo`

---

### Task 1.9 — `paymentMethodsRepo`

Same shape as `accountsRepo`. No special logic.

**Commit:** `feat(repo): paymentMethodsRepo`

---

### Task 1.10 — `transactionsRepo` basic CRUD

**Files:**

- Create: `src/repo/transactions.ts`
- Create: `src/repo/transactions.test.ts`

**Key tests:**

```ts
describe('transactionsRepo', () => {
  it('create() inserts an expense with required fields', async () => {
    const tx = await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: 'Lunch',
      tagIds: [],
      images: [],
    });
    expect(tx.id).toHaveLength(36);
    expect(tx.kind).toBe('expense');
  });

  it('create() rejects expense with amount <= 0', async () => {
    await expect(
      transactionsRepo.create({
        kind: 'expense',
        amount: 0,
        currency: 'INR',
        occurredAt: '...',
        accountId: 'a',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/amount/);
  });

  it('create() requires toAccountId for transfer kind', async () => {
    await expect(
      transactionsRepo.create({
        kind: 'transfer',
        amount: 1,
        currency: 'INR',
        occurredAt: '...',
        accountId: 'a',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/toAccountId/);
  });

  it('update() bumps updatedAt' /* ... */);
  it('remove() deletes the row' /* ... */);
});
```

**Implementation guards:**

- `kind === 'transfer'` requires `toAccountId` and `accountId !== toAccountId`.
- `kind` in `['expense','income']` requires `categoryId`.
- `amount > 0` always (sign is derived from `kind` at read time).
- On `create`/`update`, walk `tagIds` and call `tagsRepo.findOrCreate` for any that are raw strings — wait, no: `tagIds` should already be IDs. We expose a `setTags(txId, tagNames: string[])` convenience method elsewhere instead. For this task, validate `tagIds` are real IDs (every entry exists in `tags`); reject otherwise.

**Commit:** `feat(repo): transactionsRepo basic CRUD with validation`

---

### Task 1.11 — `transactionsRepo.listByRange` + filters

**Files:** modify `src/repo/transactions.ts` and `src/repo/transactions.test.ts`.

**Filter shape:**

```ts
export type TxFilters = {
  accountId?: string;
  categoryId?: string;
  subcategoryId?: string;
  tagId?: string;
  paymentMethodId?: string;
  kind?: TxKind;
  search?: string; // matched against note + place name + category name (case-insensitive)
};
```

**Tests** — inclusive `start`, exclusive `end`; filters compose AND; search matches partial; results sorted by `occurredAt` desc.

**Implementation hint:** use the `[kind+occurredAt]` index for the date range when `kind` is set, fall back to the `occurredAt` index otherwise. Apply remaining filters in memory (small N).

**Commit:** `feat(repo): listByRange with filters and search`

---

### Task 1.12 — `transactionsRepo.monthlyTotalsByCategory`

Signature:

```ts
monthlyTotalsByCategory(monthISO: string /* 'YYYY-MM' */): Promise<Array<{
  categoryId: ID;
  total: number;
  count: number;
}>>
```

**Tests:**

- Excludes `kind: 'transfer'`.
- Sums by `categoryId` (subcategory not used here).
- Returns empty array for a month with no transactions.
- Handles timezone edge correctly (Asia/Kolkata, the user's locale): boundary is `00:00:00 IST` on the first/last day of the month, then converted to UTC for the query.

**Commit:** `feat(repo): monthlyTotalsByCategory aggregation`

---

### Task 1.13 — Balances computation

**Files:**

- Create: `src/repo/balances.ts`
- Create: `src/repo/balances.test.ts`

**Signature:**

```ts
balancesRepo.compute(asOf?: Date): Promise<Map<ID /* accountId */, number>>
```

**Formula:** `balance = openingBalance + Σ(income.amount where accountId=A) + Σ(transfer.amount where toAccountId=A) − Σ(expense.amount where accountId=A) − Σ(transfer.amount where accountId=A)`.

**Tests:** 4-account scenario covering income, expense, transfer in/out, archived account still tallies, `asOf` ignores future-dated transactions.

**Commit:** `feat(repo): account balance computation`

---

### Task 1.14 — `appMetaRepo`

Singleton row with `id: 'singleton'`. Methods: `get()`, `update(patch)`. If row doesn't exist, `get()` returns null.

**Commit:** `feat(repo): appMetaRepo singleton`

---

### Task 1.15 — First-launch seed

**Files:**

- Create: `src/seed/defaults.ts` (the seed data lists)
- Create: `src/seed/seed.ts` (the seed function)
- Create: `src/seed/seed.test.ts`

**Step 1 — Defaults.** `src/seed/defaults.ts` exports:

- `DEFAULT_ACCOUNT` — one Cash account.
- `DEFAULT_CATEGORIES` — Wallet defaults + India additions, exactly as listed in Appendix A of the design doc.
- `DEFAULT_SUBCATEGORIES` — keyed by category slug, with the leaves from the appendix.
- `DEFAULT_PAYMENT_METHODS` — the 10 entries from Appendix B.
- `DEFAULT_TAGS` — `['reimburse-pending', 'reimbursed']`.

**Step 2 — Tests** for `seedIfEmpty()`:

- Inserts everything on a fresh DB.
- Is a no-op if `appMeta` already exists.
- After seeding, `categoriesRepo.list({ kind: 'expense' })` returns the expected count.
- A specific check: `subcategoriesRepo.list({ categoryId: <Temple id> })` includes `General`, `Donation`, `Prasadam`, `Kalyanostsawam`.

**Step 3 — Implementation** wraps everything in a single Dexie transaction so partial failure leaves no half-state.

**Commit:** `feat(seed): first-launch seed with Wallet defaults + India additions`

---

### Task 1.16 — OPFS image service

**Files:**

- Create: `src/services/images.ts`
- Create: `src/services/images.test.ts`

**Note:** `fake-indexeddb` doesn't fake OPFS. Two options:

1. Mock the OPFS root directory with a tiny in-memory implementation in tests.
2. Skip these tests in Vitest and cover this service in Playwright instead.

**Decision:** ship a tiny in-memory `FakeFileSystemDirectoryHandle` in `src/test/fakeOpfs.ts` that implements the methods the service uses (`getFileHandle`, `removeEntry`, `getDirectoryHandle`). Tests inject it. In production, `navigator.storage.getDirectory()` is used.

**Service API:**

```ts
imagesService.saveForTransaction(txId: string, files: File[]): Promise<string[]> // returns OPFS keys
imagesService.loadBlob(key: string): Promise<Blob>
imagesService.removeAllForTransaction(txId: string): Promise<void>
```

**Compression** in-test bypassed (canvas is jsdom-flaky) — keep the compression step behind a `compress(file)` helper that is no-op in tests.

**Commit:** `feat(services): OPFS image service with main+thumb pipeline`

---

## Phase 2 — App shell

Seven tasks. After this phase the app boots, seeds on first launch, has the bottom tab bar, theme toggle, and a working `useBalances()` hook reading from the repo.

### Task 2.1 — React Query + Zustand setup

**Install:** `npm i @tanstack/react-query zustand`

Create `src/state/queryClient.ts` (a single shared `QueryClient`) and `src/state/uiStore.ts` (Zustand store with `theme`, `transactionListRange`, `dashboardRange`, `addTxOpen`, `editingTxId`).

Wire `QueryClientProvider` into `main.tsx`.

**Commit:** `feat(state): React Query + Zustand uiStore`

---

### Task 2.2 — Theme provider

Read `appMeta.theme` (light/dark/system) → applies/removes the `.dark` class on `<html>`. Listens to system preference change events when `system`.

**Files:** `src/state/themeProvider.tsx`, `src/state/themeProvider.test.tsx`.

**Commit:** `feat(state): theme provider with light/dark/system`

---

### Task 2.3 — `useFirstRun` hook + seed wiring

A small hook called from `Root.tsx` that on mount checks `appMetaRepo.get()`. If null, calls `seedIfEmpty()` then `appMetaRepo.update({ id: 'singleton', ... defaults ... })`. Shows a centered spinner while seeding.

**Commit:** `feat: first-run seed on initial app load`

---

### Task 2.4 — Tab bar polished with icons

Replace text-only tab bar from Task 0.8 with icon+label per tab (lucide icons: `LayoutDashboard`, `List`, `Wallet`, `Settings`). Tap targets ≥ 44 px high. Active state has a top border accent.

**Commit:** `feat(ui): polished bottom tab bar with icons`

---

### Task 2.5 — `useBalances` hook

```ts
useBalances() : { balances: Map<ID, number>; isLoading: boolean; refetch: () => void }
```

Wraps `balancesRepo.compute()` in React Query with `queryKey: ['balances']`. Invalidates on any txn or account mutation (mutations call `queryClient.invalidateQueries(['balances'])`).

**Test:** mock the repo, assert hook returns the map; assert invalidation refetches.

**Commit:** `feat(state): useBalances hook with React Query`

---

### Task 2.6 — `<Header>` component

Sticky top bar with: page title (driven by current route), right-side slot for page actions. Used by every page.

**Commit:** `feat(ui): shared Header component`

---

### Task 2.7 — Smoke E2E: seed + tabs

Extend `e2e/smoke.spec.ts`:

```ts
test('first run seeds and tabs are navigable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('link', { name: 'Transactions' }).click();
  await expect(page).toHaveURL(/\/transactions$/);

  await page.getByRole('link', { name: 'Accounts' }).click();
  await expect(page).toHaveURL(/\/accounts$/);

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});
```

Verify `npm run test:e2e` passes.

**Commit:** `test(e2e): seed + navigation smoke test`

---

## Phase 3 — Settings page

Eleven tasks. CRUD-first since it unblocks transaction entry later. Each "Manage X" screen follows the same pattern, so Task 3.1 builds a reusable `<ManageListShell>` and the rest specialise.

### Task 3.1 — `<ManageListShell>` reusable component

A generic component:

```tsx
<ManageListShell
  title="Manage Categories"
  items={categories}
  renderItem={(c) => …}
  onAdd={() => …}
  onEdit={(c) => …}
  onArchive={(c) => …}
  searchPlaceholder="Search categories"
/>
```

Includes search input, list, sticky add button.

**Commit:** `feat(ui): ManageListShell generic CRUD scaffold`

---

### Task 3.2 — Manage Accounts page

Use `<ManageListShell>` with the accountsRepo. Edit/Add form: name, type select, optional bank name (visible when type ∈ {bank, savings, card}), currency input (default INR), opening balance, colour picker, icon picker (24 lucide icon shortlist).

**Commit:** `feat(settings): manage accounts`

---

### Task 3.3 — Manage Categories page

`<ManageListShell>` filtered by `kind` toggle (Expense/Income). Add/edit form has name, kind, colour, icon. Tap a row → drills to its subcategories list (Task 3.4).

**Commit:** `feat(settings): manage categories`

---

### Task 3.4 — Manage Subcategories (under a category)

Nested route `/settings/categories/:id`. Header shows parent category name. List of subcategories. Add form: name, icon (colour inherited).

**Commit:** `feat(settings): manage subcategories nested under category`

---

### Task 3.5 — Manage Tags

`<ManageListShell>` with delete (only if `usageCount === 0`), rename, sort by usage.

**Commit:** `feat(settings): manage tags`

---

### Task 3.6 — Manage Payment Methods

Standard CRUD on `paymentMethods`. Same shape as Manage Accounts.

**Commit:** `feat(settings): manage payment methods`

---

### Task 3.7 — Manage Places (with map)

`<ManageListShell>` for the list. Tap a row → opens a small `<MapView>` (Leaflet) centred on lat/lng with a draggable pin to fix typos. Add: enter name + use current GPS or tap on the map.

**Install:** `npm i leaflet react-leaflet`. Add Leaflet CSS import to `index.css`.

**Commit:** `feat(settings): manage places with Leaflet map`

---

### Task 3.8 — Profile section

Top of `/settings` page. Fields: name, base currency (read-only INR for MVP), default account select, default tx kind select, GPS toggle.

**Commit:** `feat(settings): profile section`

---

### Task 3.9 — Theme switcher

3-radio (light/dark/system). Wired to `appMetaRepo.update({ theme })` → triggers themeProvider.

**Commit:** `feat(settings): theme switcher`

---

### Task 3.10 — Backup export

Button "Export backup" → builds a JSON of all tables + base64-encoded image bytes (read from OPFS) → triggers a download via `Blob` + `<a download>`.

Filename: `purse_backup_YYYY-MM-DD_HH-mm.json`.

**Test:** unit test on the export function — given a small in-memory DB, produces a JSON whose top-level keys match the schema and `schemaVersion === 1`.

**Commit:** `feat(settings): export backup as JSON`

---

### Task 3.11 — Backup import

Button "Import backup" → `<input type="file" accept=".json">` → parses → shows preview dialog (counts: accounts, transactions, images) + merge-vs-replace toggle → on confirm, runs inside one Dexie transaction. Refuses files with `schemaVersion > currentSchemaVersion`.

Restore images: base64 decode → write to OPFS.

**Commit:** `feat(settings): import backup with preview + replace/merge`

---

## Phase 4 — Transactions page

Sixteen tasks. The biggest phase. Implementation order: list → filters → search → add sheet (kind picker → expense → income → transfer) → edit/detail → office auto-tag.

### Task 4.1 — Transactions page layout + Header

Title "Transactions" + right-side filter icon button. Sticky filter chip row directly under header. Below: list area (next task).

**Commit:** `feat(tx): transactions page layout`

---

### Task 4.2 — Transaction list grouped by day

Query `transactionsRepo.listByRange(rangeStart, rangeEnd)` via React Query. Group rows by local-date string. Render day headers as section dividers. Use `<TransactionRow>` for each row.

`<TransactionRow>` shows: category icon, note-or-category-name, subtitle line (account · method · tag chips), amount right-aligned with sign + colour.

**Commit:** `feat(tx): grouped-by-day transaction list`

---

### Task 4.3 — Date range chip row

Chips: `Week · Month* · All · Custom`. Selecting `Custom` opens a small date-range picker (use shadcn's `<Calendar>` or build a simple 2-date input).

Persists `dashboardRange` in `uiStore` and reflects in URL query (`?range=this-month`).

**Commit:** `feat(tx): date range chips`

---

### Task 4.4 — Search input with debounce

300 ms debounce. Adds `search` filter to the `listByRange` query (filter applied in the repo).

**Commit:** `feat(tx): search input with 300ms debounce`

---

### Task 4.5 — Filter sheet (Account/Category/Tag/Method/Kind)

Bottom-sheet (shadcn `<Sheet>`) with multi-select pickers. Apply button updates the filter state. Filter chip in header shows count of active filters.

**Commit:** `feat(tx): filter sheet with multi-select pickers`

---

### Task 4.6 — FAB

Floating "+" button bottom-right above the tab bar. Tap → opens `<AddTransactionSheet>` (Task 4.7).

**Commit:** `feat(tx): floating add button`

---

### Task 4.7 — `<AddTransactionSheet>` shell + kind segmented control

Bottom sheet with three tabs (segmented `<ToggleGroup>`): Expense, Income, Transfer. Switching tabs swaps the form body. Save button stuck at bottom.

The form body per kind is its own component (Tasks 4.8–4.10).

**Commit:** `feat(tx): add transaction sheet with kind segmented control`

---

### Task 4.8 — `<ExpenseForm>`

Fields: amount, date/time (defaults to now), account, category → subcategory, note, payment method, place picker (Task 4.11), images (Task 4.12), tags (Task 4.13). Required: amount, account, category.

Form lib: `react-hook-form` + `zod`. Install: `npm i react-hook-form zod @hookform/resolvers`.

**Test:** required-field validation; save creates txn + closes sheet.

**Commit:** `feat(tx): expense form`

---

### Task 4.9 — `<IncomeForm>`

Same as ExpenseForm minus place picker; category list filtered to `kind === 'income'`.

**Commit:** `feat(tx): income form`

---

### Task 4.10 — `<TransferForm>`

Fields: amount, date/time, From account, To account (must differ), payment method, note, tags. No category, no place, no images.

Validation: From and To must be different.

**Commit:** `feat(tx): transfer form`

---

### Task 4.11 — `<PlacePicker>` with GPS

Inputs: `value: placeId | null`, `onChange(placeId | null)`. On mount, if `appMeta.gpsEnabled` is true, calls `navigator.geolocation.getCurrentPosition` (cached via the browser; honour `{ maximumAge: 60000, timeout: 5000 }`). Computes Haversine distance to each known place; shows top 5 within 200 m.

Below suggestions: text input. When non-empty and GPS present, button "+ Create place here" creates a new place at the current coords.

**Test:** mock `navigator.geolocation` in jsdom; assert nearby suggestions appear.

**Commit:** `feat(tx): place picker with GPS suggestions`

---

### Task 4.12 — `<ImageAttachment>`

Component for the form: shows current thumbnails as a horizontal strip + an "Add" tile. The Add tile is a `<label>` wrapping a hidden `<input type="file" accept="image/*" capture="environment" multiple>`. On change, runs the compression pipeline (Task 1.16's `imagesService`) and updates `images` state.

**Commit:** `feat(tx): image attachment component`

---

### Task 4.13 — `<TagAutocomplete>`

Multi-tag input. Type to autocomplete from `tagsRepo.list()` (sorted by usage desc). Enter or comma creates a new tag (via `tagsRepo.findOrCreate`). Selected tags appear as removable chips above the input.

**Commit:** `feat(tx): tag autocomplete with create-on-type`

---

### Task 4.14 — Office auto-tag rule

When `<ExpenseForm>` detects the selected category is the seeded "Office" category, automatically add the `reimburse-pending` tag (chip is visible but removable).

Implementation: a `useEffect` watching `categoryId` in the form; if the resolved category name is `"Office"`, push the tag id if not already present.

**Test:** picking Office category adds the tag chip; user can remove it.

**Commit:** `feat(tx): office category auto-applies reimburse-pending tag`

---

### Task 4.15 — Edit transaction

Reuse `<AddTransactionSheet>` in edit mode by passing `editingTxId`. Sheet loads the transaction, hydrates the form. Save uses `transactionsRepo.update`.

Add an Edit button to the transaction detail sheet (Task 4.16) that sets `editingTxId`.

**Commit:** `feat(tx): edit existing transaction`

---

### Task 4.16 — Transaction detail sheet

Tap a row in the transactions list → opens a read-only sheet with: amount, kind label, account(s), category > subcategory, note, payment method, place + mini-map, image carousel (tap an image for full-screen viewer), tag chips, created/updated timestamps. Buttons: Edit, Delete (with confirm).

**Install:** `npm i embla-carousel-react` for the image carousel.

**Commit:** `feat(tx): transaction detail sheet with mini-map + carousel`

---

## Phase 5 — Dashboard

Five tasks.

### Task 5.1 — Time-range chip row

Same as Task 4.3 (different state slice: `dashboardRange`). Persists in URL.

**Commit:** `feat(dashboard): time range chip row`

---

### Task 5.2 — Net summary card

Three numbers: Income (sum of `kind=income`), Expense (sum of `kind=expense`), Net. Transfers excluded.

Query: a small `repo` method `summary(start, end)` returning `{ income, expense, net }`. Test the math.

**Commit:** `feat(dashboard): net summary card`

---

### Task 5.3 — Pending reimbursements chip

Visible only if any expense in the chosen range has tag `reimburse-pending`. Shows count + total. Tap → navigates to `/transactions?tag=reimburse-pending&range=this-month`.

**Commit:** `feat(dashboard): pending reimbursements chip`

---

### Task 5.4 — Accounts strip

Horizontal scroll of small account cards using `useBalances`. Tap a card → navigates to `/transactions?account=<id>&range=this-month`.

**Commit:** `feat(dashboard): accounts strip`

---

### Task 5.5 — Spend-by-category donut

Recharts donut chart. Data from `transactionsRepo.monthlyTotalsByCategory`. Top 6 categories shown; the rest grouped into "Others". Legend below with `₹amount (%)`. Tap a slice → drill to that category for the range.

**Install:** `npm i recharts`

**Commit:** `feat(dashboard): spend-by-category donut chart`

---

## Phase 6 — PWA polish

### Task 6.1 — Real app icons

Replace the placeholder SVG with a designed Purse icon. Generate 192/512 PNG + maskable variants. Update manifest.

**Tooling:** use any online maskable.app or `pwa-asset-generator` from a single high-res SVG.

**Commit:** `feat(pwa): final app icons`

---

### Task 6.2 — Install prompt UX

Listen for `beforeinstallprompt`. Show a dismissible banner on Dashboard the first session that fires it. Dismissal persisted in `appMeta`.

**Commit:** `feat(pwa): install-to-home-screen prompt`

---

### Task 6.3 — Service worker update toast

When `vite-plugin-pwa`'s `useRegisterSW` reports an update, show a shadcn `<Toast>` with a Refresh button that calls `updateSW(true)`.

**Commit:** `feat(pwa): update-available toast`

---

### Task 6.4 — Empty states

For each of the 4 pages, an empty state with friendly illustration (lucide icon at 64 px) + 1-line message + 1 CTA button.

**Commit:** `feat(ui): empty states for all pages`

---

### Task 6.5 — Offline verification

Manual: `npm run build && npm run preview`, install via Chrome dev tools "Application → Manifest → Install", toggle "Offline" in dev tools, confirm everything works. Document the run in `docs/smoke.md`.

**Commit:** `docs: smoke checklist with offline verification`

---

## Phase 7 — End-to-end tests

Five Playwright specs corresponding to the 5 listed in §8.4 of the design doc.

### Task 7.1 — `e2e/seed.spec.ts`

First-run → seeded categories visible in Settings → Manage Categories.

**Commit:** `test(e2e): first-run seeds expected categories`

---

### Task 7.2 — `e2e/add-expense.spec.ts`

Add an expense with: amount, account, category, note, 1 image (use a Playwright `setInputFiles` with a fixture PNG). GPS mocked via `context.grantPermissions(['geolocation'])` + `context.setGeolocation({ latitude, longitude })`.

Asserts: txn appears in list; Dashboard donut updates.

**Commit:** `test(e2e): add expense with GPS + image`

---

### Task 7.3 — `e2e/edit-tx.spec.ts`

Add an expense, then edit it, change amount and category, save, assert Dashboard reflects the new amount.

**Commit:** `test(e2e): edit transaction updates dashboard`

---

### Task 7.4 — `e2e/transfer-not-in-expense.spec.ts`

Add two accounts, add a transfer between them, assert: Dashboard Expense total **does not** include the transfer amount; both account balances reflect the move.

**Commit:** `test(e2e): transfers excluded from expense totals`

---

### Task 7.5 — `e2e/backup-roundtrip.spec.ts`

Add several txns + 1 image; export backup; capture file via Playwright download API; clear all data via Settings; import the backup; assert counts and image bytes match (compare SHA-256).

**Commit:** `test(e2e): backup export/import roundtrip preserves all data`

---

## Phase 8 — Deploy

### Task 8.1 — Push final main + verify Vercel deploy

```bash
git push origin main
```

Confirm in Vercel dashboard: the build completes; the production URL shows the app; install-to-home-screen works on a real Android device.

**No commit needed** — push only.

---

### Task 8.2 — Lighthouse pass

Run a Lighthouse audit on the production URL.

Targets:

- Performance ≥ 90
- Accessibility ≥ 95
- Best Practices ≥ 95
- PWA installable ✓

Fix anything red. Commit fixes individually.

---

### Task 8.3 — Tag v0.1.0

```bash
git tag -a v0.1.0 -m "MVP"
git push --tags
```

Write a tiny `CHANGELOG.md` referencing the 4 pages and key features. Commit.

**Commit:** `docs: v0.1.0 changelog`

---

## Definition of done (MVP)

- All 70 tasks committed individually.
- `npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e` all green locally and in CI.
- Production deploy at `https://purse.vercel.app` (or chosen domain) installable to Android home screen.
- Manual smoke checklist `docs/smoke.md` passes end-to-end on a real device.
- Lighthouse meets the targets in Task 8.2.
- Repository README points at the design doc and this plan; both checked in.

---

## Notes for the executing agent

- **Read the design doc first.** This plan deliberately omits "why" — that's in the design doc.
- **TDD is required** for everything in `src/repo/*`, `src/services/*`, `src/lib/*`, `src/seed/*`. UI components can ship without unit tests if their behaviour is covered by an E2E.
- **Commit per task.** Never batch. The task IDs in this plan are the audit trail.
- **If a task is blocked**, write a short note in `docs/blockers.md` and continue with the next independent task. Common blockers: real device unavailable for offline test, GitHub auth, Vercel project creation. Don't loop — flag and move on.
- **Verification before completion** — never tick a task without running the listed command and reading its output. Use `@superpowers:verification-before-completion`.
