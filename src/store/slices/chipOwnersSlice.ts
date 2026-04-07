import type { StateCreator } from 'zustand';

import type { EpochChipOwnersData } from '@/types';

import type { DashboardState } from '../index';

export type ChipOwnersSource =
  | 'cache-fresh'
  | 'cache-stale-fallback'
  | 'network'
  | null;

export interface ChipOwnersSlice {
  /** Parsed dataset, or null until first successful load. */
  chipOwners: EpochChipOwnersData | null;
  chipOwnersLoading: boolean;
  chipOwnersError: string | null;
  /** Where the current `chipOwners` payload came from. */
  chipOwnersSource: ChipOwnersSource;
  /** ISO timestamp the slice last received a payload. */
  chipOwnersLastUpdated: string | null;
  /** Bumped on every successful load (mirrors `dataVersion` for memos). */
  chipOwnersVersion: number;

  setChipOwners: (data: EpochChipOwnersData, source: ChipOwnersSource) => void;
  setChipOwnersLoading: (loading: boolean) => void;
  setChipOwnersError: (error: string | null) => void;
}

export const createChipOwnersSlice: StateCreator<
  DashboardState,
  [],
  [],
  ChipOwnersSlice
> = (set) => ({
  chipOwners: null,
  chipOwnersLoading: false,
  chipOwnersError: null,
  chipOwnersSource: null,
  chipOwnersLastUpdated: null,
  chipOwnersVersion: 0,

  setChipOwners: (data, source) =>
    set((state) => ({
      chipOwners: data,
      chipOwnersSource: source,
      chipOwnersLastUpdated: new Date().toISOString(),
      chipOwnersLoading: false,
      chipOwnersError: null,
      chipOwnersVersion: state.chipOwnersVersion + 1,
    })),

  setChipOwnersLoading: (chipOwnersLoading) => set({ chipOwnersLoading }),
  setChipOwnersError: (chipOwnersError) =>
    set({ chipOwnersError, chipOwnersLoading: false }),
});
