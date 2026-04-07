import type { StateCreator } from 'zustand';

import type {
  FacilityHandle,
  LabFilter,
  SortBy,
  SortDir,
  StatusFilter,
} from '@/types';

import type { DashboardState } from '../index';

export interface IntelSlice {
  labFilter: LabFilter;
  statusFilter: StatusFilter;
  sortBy: SortBy;
  sortDir: SortDir;
  /** Handle of the currently expanded data center drawer, or null. */
  expandedDC: FacilityHandle | null;

  setLabFilter: (lab: LabFilter) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortDir: (sortDir: SortDir) => void;
  /**
   * Click-to-sort: same column flips direction, new column resets to
   * descending (so the highest value floats to the top).
   */
  toggleSort: (sortBy: SortBy) => void;
  setExpandedDC: (handle: FacilityHandle | null) => void;
}

export const createIntelSlice: StateCreator<
  DashboardState,
  [],
  [],
  IntelSlice
> = (set, get) => ({
  labFilter: 'ALL',
  statusFilter: 'ALL',
  sortBy: 'conf',
  sortDir: 'desc',
  expandedDC: null,

  setLabFilter: (labFilter) => set({ labFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortDir: (sortDir) => set({ sortDir }),
  toggleSort: (col) => {
    const { sortBy, sortDir } = get();
    if (sortBy === col) {
      set({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      set({ sortBy: col, sortDir: 'desc' });
    }
  },
  setExpandedDC: (expandedDC) => set({ expandedDC }),
});
