import { ICON_OPTIONS } from './iconOptions';
import { cn } from '@/lib/utils';

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Icon" className="grid grid-cols-6 gap-2">
      {ICON_OPTIONS.map(({ name, Icon }) => {
        const selected = name === value;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            onClick={() => onChange(name)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-md border transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background hover:bg-accent',
            )}
          >
            <Icon className="size-5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
