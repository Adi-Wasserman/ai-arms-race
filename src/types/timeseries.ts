import type { Lab } from './lab';

/** String key for a lab's power field in a time-series point ("OpenAI_pw", …). */
export type LabPwKey = `${Lab}_pw`;

/**
 * One cumulative snapshot across all labs. H100e value keyed by Lab name,
 * power (MW) keyed by `${Lab}_pw`. `tH` / `tP` are the all-lab totals.
 */
export type TimeSeriesPoint = {
  date: string;
  tH: number;
  tP: number;
} & { [K in Lab]: number } & { [K in LabPwKey]: number };

export type SeriesData = TimeSeriesPoint[];

export interface LeadChange {
  date: string;
  leader: Lab;
  value: number;
  prev: Lab | null;
}

/** Per-lab annualized velocity snapshot at a given date. */
export type VelocityPoint = {
  date: string;
} & { [K in Lab]: number | null } & { [K in LabPwKey]: number | null };

export type VelocitySeries = VelocityPoint[];
