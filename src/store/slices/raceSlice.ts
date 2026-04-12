import type { StateCreator } from 'zustand';

import type {
  Lab,
  MetricMode,
  ProjMode,
  RaceMode,
  ScopeMode,
} from '@/types';

import type { DashboardState } from '../index';

export interface RaceSlice {
  metric: MetricMode;
  scope: ScopeMode;
  projMode: ProjMode;
  /** Lab currently hovered in the legend (null = none). */
  hoveredLab: Lab | null;
  /**
   * Race section view mode — only meaningful when `scope === 'fleet'`.
   * `effective` shows the existing chart+leaderboard, `ownership`
   * swaps in the OwnershipTable sourced from `useEpochChipOwners`.
   */
  raceMode: RaceMode;
  /**
   * Owner name (Epoch's vocabulary, e.g. "Google", "Microsoft") that
   * the OwnershipTable should highlight + scroll-into-view on next
   * render. Set by the OwnershipSidePanel cards when the user clicks
   * one. The OwnershipTable consumes it via an effect, scrolls the
   * matching row, applies a highlight class, and clears it after a
   * short delay so re-clicking the same card re-triggers the highlight.
   */
  highlightedOwner: string | null;

  setMetric: (metric: MetricMode) => void;
  setScope: (scope: ScopeMode) => void;
  setProjMode: (projMode: ProjMode) => void;
  setHoveredLab: (lab: Lab | null) => void;
  setRaceMode: (mode: RaceMode) => void;
  setHighlightedOwner: (owner: string | null) => void;
}

export const createRaceSlice: StateCreator<
  DashboardState,
  [],
  [],
  RaceSlice
> = (set) => ({
  metric: 'h100e',
  scope: 'fleet',
  projMode: 'current',
  hoveredLab: null,
  raceMode: 'effective',
  highlightedOwner: null,

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
  setHoveredLab: (hoveredLab) => set({ hoveredLab }),
  setRaceMode: (raceMode) => set({ raceMode }),
  setHighlightedOwner: (highlightedOwner) => set({ highlightedOwner }),
});
