/**
 * Purse word-mark / monogram in the Concierge style.
 *
 * The SVG is a minimal lime "P" inside a warm-dark rounded square — same
 * shape used by the PWA app icons in public/icon-*.svg so the splash and
 * the home-screen icon read as one identity.
 */
export function BrandMark({ size = 96, rounded = true }: { size?: number; rounded?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-label="Purse"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="purse-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1F1C16" />
          <stop offset="100%" stopColor="#0A0908" />
        </linearGradient>
      </defs>
      <rect
        x="0"
        y="0"
        width="96"
        height="96"
        rx={rounded ? 22 : 0}
        ry={rounded ? 22 : 0}
        fill="url(#purse-mark-bg)"
      />
      {/*
        The Bricolage-flavoured "P". Custom-drawn so we don't depend on the
        font having loaded by the time the splash paints — first-frame
        critical path.
      */}
      <path
        d="M30 22h22a18 18 0 1 1 0 36H40v16h-10V22Zm10 26h11a8 8 0 1 0 0-16H40v16Z"
        fill="#E5EE5C"
      />
    </svg>
  );
}
