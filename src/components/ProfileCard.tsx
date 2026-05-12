import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { appMetaRepo } from '@/repo/appMeta';

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'P';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Compact profile card at the top of Settings.
 *
 * The design pairs the user's monogram avatar with a privacy chip
 * ("Local-only · 14.2 MB on this device"). We don't yet measure
 * storage usage \xe2\x80\x94 the size estimate is a static "On this device"
 * label until a future telemetry pass.
 */
export function ProfileCard() {
  const { data: meta } = useQuery({
    queryKey: ['appMeta'],
    queryFn: () => appMetaRepo.get(),
  });
  if (!meta) return null;

  const displayName = meta.userName?.trim() || 'Set your name in Profile';
  const initials = initialsFor(meta.userName?.trim() || 'P');

  return (
    <div
      className="border-border flex items-center gap-3 rounded-2xl border p-4"
      style={{
        background:
          'linear-gradient(155deg, var(--color-accent), transparent 80%), var(--color-card)',
      }}
    >
      <div
        aria-hidden
        className="bg-primary text-primary-foreground font-display grid size-12 place-items-center rounded-full text-lg font-bold"
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{displayName}</div>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[11.5px]">
          <ShieldCheck
            className="size-3 shrink-0"
            style={{ color: 'var(--color-income)' }}
            aria-hidden
          />
          Local-only · On this device
        </div>
      </div>
    </div>
  );
}
