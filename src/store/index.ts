import { create } from 'zustand';

import {
  createChipOwnersSlice,
  type ChipOwnersSlice,
} from './slices/chipOwnersSlice';
import { createDataSlice, type DataSlice } from './slices/dataSlice';
import { createIntelSlice, type IntelSlice } from './slices/intelSlice';
import { createMapSlice, type MapSlice } from './slices/mapSlice';
import { createModelsSlice, type ModelsSlice } from './slices/modelsSlice';
import { createRaceSlice, type RaceSlice } from './slices/raceSlice';

/**
 * Combined store state. Each feature slice may read from any other slice
 * (via `get()` or selector hooks) but should only *write* to its own
 * fields, with one exception: `setScope` / `setMetric` / `setData` also
 * null out `proj2029` to invalidate the projection cache.
 */
export type DashboardState = DataSlice &
  RaceSlice &
  IntelSlice &
  ModelsSlice &
  MapSlice &
  ChipOwnersSlice;

export const useDashboard = create<DashboardState>()((...args) => ({
  ...createDataSlice(...args),
  ...createRaceSlice(...args),
  ...createIntelSlice(...args),
  ...createModelsSlice(...args),
  ...createMapSlice(...args),
  ...createChipOwnersSlice(...args),
}));

/** Non-reactive read (use inside event handlers, selectors, etc). */
export const getDashboardState = (): DashboardState => useDashboard.getState();

export type {
  ChipOwnersSlice,
  DataSlice,
  IntelSlice,
  MapSlice,
  ModelsSlice,
  RaceSlice,
};
export type { DataPayload, DataSource } from './slices/dataSlice';
export type { ChipOwnersSource } from './slices/chipOwnersSlice';
