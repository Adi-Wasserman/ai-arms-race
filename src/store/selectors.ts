import { LAB_NAMES } from '@/config/labs';
import { EASE_OUT_EXPONENT, PROJ_END, PROJ_UNCERTAINTY } from '@/config/projections';
import { PROJ_2029_TARGETS } from '@/data/projections';
import { buildProjections2029 } from '@/services/projections';
import type { Lab, ProjectionBands, TimeSeriesPoint } from '@/types';

import type { DashboardState } from './index';

/** "Today" anchor used by the projection engine. */
const TODAY = new Date().toISOString().slice(0, 10);

/* ─────────────────────────────────────────────────────────────
   Derived selectors. Pure functions of DashboardState.

   These mirror the Store helpers in ai-arms-race.html
   (activeSeries, getValue, activeSeriesWithProj, activeProj).
   `activeProj` consults the slice-level cache first; if stale it
   computes fresh bands but does NOT write them back — callers who
   want to fill the cache should go through `ensureProjections`.
   ───────────────────────────────────────────────────────────── */

/** The time series the race chart is currently drawing from. */
export function activeSeries(state: DashboardState): TimeSeriesPoint[] {
  return state.scope === 'fleet' ? state.seriesFull : state.seriesEpoch;
}

/**
 * Read the metric-appropriate value off a single snapshot.
 * Returns H100e when `metric === 'h100e'`, otherwise the power field.
 */
export function getValue(
  state: DashboardState,
  point: TimeSeriesPoint,
  lab: Lab,
): number {
  return state.metric === 'power' ? point[`${lab}_pw`] : point[lab];
}

/**
 * 2029 projection bands for the currently-active series.
 *
 * Pure: returns `state.proj2029` if the cache is warm, otherwise computes
 * fresh bands and returns them without mutating state. Use
 * `ensureProjections(useDashboard.getState)` if you want the result to
 * be persisted into the store cache.
 */
export function activeProj(state: DashboardState): ProjectionBands {
  if (state.proj2029) return state.proj2029;
  const base = activeSeries(state);
  return buildProjections2029(
    base,
    LAB_NAMES,
    PROJ_2029_TARGETS,
    PROJ_END,
    PROJ_UNCERTAINTY,
    TODAY,
  );
}

/**
 * Active series extended with 2029 projection points when `projMode`
 * is `"2029"`. Only projection points *beyond* the last observed date
 * are appended — the base series may already extend through late 2028
 * via Epoch data.
 */
export function activeSeriesWithProj(state: DashboardState): TimeSeriesPoint[] {
  const base = activeSeries(state);
  if (state.projMode !== '2029') return base;

  const proj = activeProj(state);
  const lastBaseDate = base.length > 0 ? base[base.length - 1].date : '';
  const extra = proj.central.filter((p) => p.date > lastBaseDate);
  return base.concat(extra);
}

/**
 * Imperative helper: fill the projection cache if empty, then return it.
 * Writes through to `state.proj2029` so subsequent `activeProj` reads
 * are O(1). Accepts the store's `getState` so it can be called from any
 * layer without importing the hook.
 */
export function ensureProjections(
  getState: () => DashboardState,
): ProjectionBands {
  const state = getState();
  if (state.proj2029) return state.proj2029;
  const fresh = activeProj(state);
  state.setProjections(fresh);
  return fresh;
}

/** Exposed for tests / debugging. */
export const PROJECTION_CONSTANTS = {
  TODAY,
  PROJ_END,
  PROJ_UNCERTAINTY,
  EASE_OUT_EXPONENT,
} as const;
