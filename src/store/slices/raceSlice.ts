import type { StateCreator } from 'zustand';

import type { Lab, MetricMode, ProjMode, ScopeMode, VelocityMode } from '@/types';

import type { DashboardState } from '../index';

export interface RaceSlice {
  metric: MetricMode;
  scope: ScopeMode;
  projMode: ProjMode;
  velocityMode: VelocityMode;
  /** Lab currently hovered in the legend (null = none). */
  hoveredLab: Lab | null;

  setMetric: (metric: MetricMode) => void;
  setScope: (scope: ScopeMode) => void;
  setProjMode: (projMode: ProjMode) => void;
  setVelocityMode: (velocityMode: VelocityMode) => void;
  setHoveredLab: (lab: Lab | null) => void;
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

  // scope + metric changes invalidate the projection cache (same rule as
  // the legacy Store.set — see ai-arms-race.html line 1584).
  setMetric: (metric) => set({ metric, proj2029: null }),
  setScope: (scope) => set({ scope, proj2029: null }),

  setProjMode: (projMode) => set({ projMode }),
  setVelocityMode: (velocityMode) => set({ velocityMode }),
  setHoveredLab: (hoveredLab) => set({ hoveredLab }),
});
