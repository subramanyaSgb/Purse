import { BrandMark } from './BrandMark';

/**
 * Branded loading screen shown by Root.tsx while useFirstRun seeds the DB
 * on first launch. Matches the PWA app icon so the in-app splash is
 * indistinguishable from the OS-rendered splash that fires before JS boots.
 */
export function SplashScreen() {
  return (
    <div
      role="status"
      aria-label="Setting up Purse"
      className="bg-background grid h-full w-full place-items-center"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <BrandMark size={88} />
          {/* Soft lime halo behind the mark — sits in the same SVG plane as
              the hero balance card on Dashboard, ties them visually. */}
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-3xl blur-2xl"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 70%)',
            }}
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-display text-foreground text-lg font-semibold tracking-tight">
            Purse
          </span>
          <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            Setting up your local-first wallet…
          </span>
        </div>
        <span aria-hidden className="bg-primary mt-1 h-0.5 w-10 animate-pulse rounded-full" />
      </div>
    </div>
  );
}
