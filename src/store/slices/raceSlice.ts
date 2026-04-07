import type { StateCreator } from 'zustand';

import type {
  Lab,
  MetricMode,
  ProjMode,
  RaceMode,
  ScopeMode,
  VelocityMode,
} from '@/types';

import type { DashboardState } from '../index';

export interface RaceSlice {
  metric: MetricMode;
  scope: ScopeMode;
  projMode: ProjMode;
  velocityMode: VelocityMode;
  /** Lab currently hovered in the legend (null = none). */
  hoveredLab: Lab | null;
  /**
   * Race section view mode — only meaningful when `scope === 'fleet'`.
   * `effective` shows the existing chart+leaderboard, `ownership`
   * swaps in the OwnershipTable sourced from `useEpochChipOwners`.
   */
  raceMode: RaceMode;

  setMetric: (metric: MetricMode) => void;
  setScope: (scope: ScopeMode) => void;
  setProjMode: (projMode: ProjMode) => void;
  setVelocityMode: (velocityMode: VelocityMode) => void;
  setHoveredLab: (lab: Lab | null) => void;
  setRaceMode: (mode: RaceMode) => void;
}

export const createRaceSlice: StateCreator<
  DashboardState,
  [],
  [],
  RaceSlice
> = (set) => ({
  metric: 'h100e',
  scope: 'tracked',
  projMode: 'current',
  velocityMode: 'absolute',
  hoveredLab: null,
  raceMode: 'effective',

  // scope + metric changes invalidate the projection cache (same rule as
  // the legacy Store.set — see ai-arms-race.html line 1584).
  setMetric: (metric) => set({ metric, proj2029: null }),
  setScope: (scope) =>
    // Toggling away from `fleet` also resets raceMode — ownership view
    // is meaningless without the fleet scope.
    set((state) => ({
      scope,
      proj2029: null,
      raceMode: scope === 'fleet' ? state.raceMode : 'effective',
    })),

  setProjMode: (projMode) => set({ projMode }),
  setVelocityMode: (velocityMode) => set({ velocityMode }),
  setHoveredLab: (hoveredLab) => set({ hoveredLab }),
  setRaceMode: (raceMode) => set({ raceMode }),
});
