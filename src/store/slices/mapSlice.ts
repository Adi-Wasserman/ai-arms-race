import type { StateCreator } from 'zustand';

import type { FacilityHandle, RegionKey } from '@/types';

import type { DashboardState } from '../index';

export interface MapSlice {
  region: RegionKey;
  /** Handle of the currently selected facility pin, or null. */
  selectedFacility: FacilityHandle | null;

  setRegion: (region: RegionKey) => void;
  setSelectedFacility: (handle: FacilityHandle | null) => void;
}

export const createMapSlice: StateCreator<
  DashboardState,
  [],
  [],
  MapSlice
> = (set) => ({
  region: 'us',
  selectedFacility: null,

  setRegion: (region) => set({ region }),
  setSelectedFacility: (selectedFacility) => set({ selectedFacility }),
});
