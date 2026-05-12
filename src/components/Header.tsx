import { cn } from '@/lib/utils';

export type HeaderProps = {
  title: string;
  /** Optional eyebrow line above the title (e.g. weekday, breadcrumb). */
  eyebrow?: string;
  /** Right-side actions: buttons, links, an icon menu. */
  actions?: React.ReactNode;
  /**
   * Larger display size used on top-level tab pages (Activity, Accounts,
   * Settings). Defaults to false for nested pages like Settings → Accounts.
   */
  large?: boolean;
  className?: string;
};

/**
 * Shared sticky page header. Renders the title in the Bricolage display
 * face per the Concierge design; `large` switches to the 26px hero size
 * used on top-level tab screens.
 */
export function Header({ title, eyebrow, actions, large = false, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'bg-background/95 sticky top-0 z-10 flex items-center justify-between border-b px-4 backdrop-blur-md',
        large ? 'h-16 pt-2' : 'h-14',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col">
        {eyebrow ? (
          <span className="text-muted-foreground text-xs font-medium">{eyebrow}</span>
        ) : null}
        <h1
          className={cn(
            'font-display truncate tracking-tight',
            large ? 'text-2xl font-semibold' : 'text-base font-semibold',
          )}
        >
          {title}
        </h1>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
