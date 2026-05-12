import { create } from 'zustand';
import type { Theme } from '@/domain/types';

/**
 * Date range selection for list / dashboard views. `'thisMonth'` is the
 * default; we'll add more presets (week / year / custom) as the UI
 * matures in Phases 4 and 5.
 */
export type RangePreset = 'thisMonth' | 'lastMonth' | 'last7d' | 'last30d' | 'allTime';

type UiState = {
  /** Mirror of appMeta.theme; the theme provider syncs it on boot and on save. */
  theme: Theme;
  setTheme: (t: Theme) => void;

  /** Date-range chip selection on the Transactions tab. */
  transactionListRange: RangePreset;
  setTransactionListRange: (r: RangePreset) => void;

  /** Date-range chip selection on the Dashboard tab. */
  dashboardRange: RangePreset;
  setDashboardRange: (r: RangePreset) => void;

  /** Whether the Add Transaction sheet is open. */
  addTxOpen: boolean;
  openAddTx: () => void;
  closeAddTx: () => void;

  /** The id of the transaction currently being edited (null if none). */
  editingTxId: string | null;
  setEditingTxId: (id: string | null) => void;

  /** The id of the transaction currently shown in the detail sheet (null if none). */
  detailTxId: string | null;
  setDetailTxId: (id: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),

  transactionListRange: 'thisMonth',
  setTransactionListRange: (transactionListRange) => set({ transactionListRange }),

  dashboardRange: 'thisMonth',
  setDashboardRange: (dashboardRange) => set({ dashboardRange }),

  addTxOpen: false,
  openAddTx: () => set({ addTxOpen: true }),
  closeAddTx: () => set({ addTxOpen: false }),

  editingTxId: null,
  setEditingTxId: (editingTxId) => set({ editingTxId }),

  detailTxId: null,
  setDetailTxId: (detailTxId) => set({ detailTxId }),
}));
