import type { RangePreset } from '@/state/uiStore';

export type DateRangeChip = { id: RangePreset; label: string };

export const DEFAULT_RANGE_CHIPS: DateRangeChip[] = [
  { id: 'thisMonth', label: 'Month' },
  { id: 'last7d', label: 'Week' },
  { id: 'last30d', label: '30 days' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'allTime', label: 'All' },
];
