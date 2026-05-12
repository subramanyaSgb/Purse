import { COLOUR_OPTIONS } from './colourOptions';
import { cn } from '@/lib/utils';

export function ColourPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Colour" className="grid grid-cols-7 gap-2">
      {COLOUR_OPTIONS.map((hex) => {
        const selected = hex.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={hex}
            onClick={() => onChange(hex)}
            className={cn(
              'ring-offset-background relative size-8 rounded-full border-2 transition-shadow',
              selected ? 'border-foreground ring-2 ring-offset-2' : 'border-transparent',
            )}
            style={{ backgroundColor: hex }}
          />
        );
      })}
    </div>
  );
}
