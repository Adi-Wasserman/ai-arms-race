import type { Lab } from './lab';
import type { TimeSeriesPoint } from './timeseries';

/** Jan 2029 per-lab power-constrained target. */
export interface ProjectionTarget {
  /** H100-equivalent chip count target. */
  h: number;
  /** Power envelope in MW. */
  p: number;
  /** Source/basis text shown in the UI. */
  basis: string;
}

export type ProjectionTargetMap = Readonly<Record<Lab, ProjectionTarget>>;

export interface ProjectionPoint {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

export interface UncertaintyBand {
  /** Base uncertainty (fractional, e.g. 0.08 = ±8%). */
  base: number;
  /** Additional uncertainty added per year from "today". */
  perYear: number;
}

export interface AnalystEstimate {
  semi: number | null;
  aa: number | null;
  note: string;
}

export type AnalystEstimateMap = Readonly<Record<Lab, AnalystEstimate>>;

/** Three-band projection output produced by `buildProjections2029`. */
export interface ProjectionBands {
  central: TimeSeriesPoint[];
  low: TimeSeriesPoint[];
  high: TimeSeriesPoint[];
}
