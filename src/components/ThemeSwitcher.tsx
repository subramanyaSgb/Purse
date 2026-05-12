import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { appMetaRepo } from '@/repo/appMeta';
import { useUiStore } from '@/state/uiStore';
import type { Theme } from '@/domain/types';

const APP_META_QUERY_KEY = ['appMeta'] as const;

const THEMES: { value: Theme; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: "Match this device's setting" },
  { value: 'light', label: 'Light', hint: 'Always light' },
  { value: 'dark', label: 'Dark', hint: 'Always dark' },
];

export function ThemeSwitcher() {
  const qc = useQueryClient();
  const setStoreTheme = useUiStore((s) => s.setTheme);
  const { data: meta } = useQuery({
    queryKey: APP_META_QUERY_KEY,
    queryFn: () => appMetaRepo.get(),
  });

  const persist = useMutation({
    mutationFn: (theme: Theme) => appMetaRepo.update({ theme }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: APP_META_QUERY_KEY });
    },
  });

  if (!meta) return null;

  function handleChange(value: string) {
    const theme = value as Theme;
    setStoreTheme(theme); // applies the .dark class immediately via the provider
    persist.mutate(theme); // persists for next launch
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Appearance
      </h2>
      <div className="bg-card rounded-md border p-4">
        <RadioGroup value={meta.theme} onValueChange={handleChange} className="flex flex-col gap-3">
          {THEMES.map((t) => (
            <Label
              key={t.value}
              htmlFor={`theme-${t.value}`}
              className="flex items-center gap-3 font-normal"
            >
              <RadioGroupItem id={`theme-${t.value}`} value={t.value} />
              <span className="flex-1">
                <span className="block font-medium">{t.label}</span>
                <span className="text-muted-foreground block text-xs">{t.hint}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </div>
    </section>
  );
}
