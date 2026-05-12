import { cn } from '@/lib/utils';

export type HeaderProps = {
  title: string;
  /** Right-side actions: buttons, links, an icon menu. */
  actions?: React.ReactNode;
  /** Extra class overrides for the outer <header> element. */
  className?: string;
};

/**
 * Shared sticky header used by every page. Title is left-aligned;
 * `actions` lives flush right. Height fits the iOS hit-target spec
 * (min 44 px) with a bit of headroom.
 */
export function Header({ title, actions, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'bg-background sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4',
        className,
      )}
    >
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
