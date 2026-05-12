# Purse

A local-first personal finance PWA. Your money data lives on your device, not on a server.

## Run locally

```bash
npm install
npm run dev
```

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

See [docs/plans/2026-05-11-purse-design.md](docs/plans/2026-05-11-purse-design.md) for the canonical design and [docs/plans/2026-05-11-purse-implementation.md](docs/plans/2026-05-11-purse-implementation.md) for the implementation plan.
