import { cn } from '@/lib/utils';

export type HeaderProps = {
  title: string;
  /** Optional eyebrow line above the title (e.g. weekday, breadcrumb). */
  eyebrow?: string;
  /** Right-side actions: buttons, links, an icon menu. */
  actions?: React.ReactNode;
  /**
   * Top-level tab pages (Activity, Accounts, Settings) use the design's
   * inline 26px Bricolage display title with no sticky bar. Nested pages
   * (Settings → Manage Accounts) use the sticky 14px row with a hairline
   * border so it stays anchored while the list scrolls behind.
   */
  large?: boolean;
  className?: string;
};

/**
 * Shared page header. Two variants:
 *
 * - `large` = true → non-sticky, no border, larger inline display title.
 *   Matches every top-level screen in the Concierge design.
 * - `large` = false (default) → sticky, hairline-bordered compact row.
 *   For nested settings pages, manage-X screens, and other sub-routes.
 */
export function Header({ title, eyebrow, actions, large = false, className }: HeaderProps) {
  if (large) {
    return (
      <header className={cn('flex items-center justify-between px-4 pt-5 pb-3', className)}>
        <div className="flex min-w-0 flex-col">
          {eyebrow ? (
            <span className="text-muted-foreground text-xs font-medium">{eyebrow}</span>
          ) : null}
          <h1 className="font-display truncate text-[26px] font-semibold tracking-tight">
            {title}
          </h1>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
    );
  }

  return (
    <header
      className={cn(
        'bg-background/95 sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col">
        {eyebrow ? (
          <span className="text-muted-foreground text-xs font-medium">{eyebrow}</span>
        ) : null}
        <h1 className="font-display truncate text-base font-semibold tracking-tight">{title}</h1>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
