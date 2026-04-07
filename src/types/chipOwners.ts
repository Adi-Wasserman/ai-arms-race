/**
 * Type shapes for the Epoch AI Chip Owners dataset.
 *
 * Source ZIP: https://epoch.ai/data/ai_chip_owners.zip
 *
 * Schema verified via `scripts/diagnose-epoch-chipowners.ts` against the
 * 2026-04-06 release. The ZIP contains three CSVs (plus a README that
 * we ignore):
 *
 *   cumulative_by_designer.csv  — owner × manufacturer × through-quarter
 *                                  totals. No per-chip-type rows.
 *   quarters_by_chip_type.csv   — owner × chip × per-quarter delta
 *                                  (acquisitions THIS quarter, not cumulative).
 *   cumulative_by_chip_type.csv — owner × chip × through-quarter totals.
 *                                  Headline snapshot source.
 */

import type { Lab } from './lab';

/** One distinct operator that buys chips, per Epoch's vocabulary. */
export type ChipOwner =
  | 'Microsoft'
  | 'Meta'
  | 'Amazon'
  | 'Google'
  | 'Oracle'
  | 'xAI'
  | 'China'
  | 'Other';

/** One distinct chip vendor. */
export type ChipManufacturer = 'Nvidia' | 'Google' | 'Amazon' | 'AMD' | 'Huawei';

/**
 * Approximate Owner → Lab attribution for the Race / Models sections.
 *
 * **Caveat:** this is an over-attribution. Epoch's `Owner` is the
 * *operator* not the frontier *lab*, so e.g. all Microsoft chips
 * (including Bing/Office workloads) get attributed to OpenAI here.
 * Use this for visual cross-reference only — never as a precise
 * "lab compute" figure.
 *
 * Owners NOT mapped (Oracle, China, Other) intentionally have no entry
 * — Oracle hosts multiple labs, China is geographic, Other is residual.
 */
export const OWNER_TO_LAB: Partial<Record<ChipOwner, Lab>> = {
  Microsoft: 'OpenAI',
  Amazon: 'Anthropic',
  Google: 'Gemini',
  Meta: 'Meta',
  xAI: 'xAI',
};

/* ─────────────────────────────────────────────────────────────
   Raw row shapes (one per CSV file in the ZIP).
   Field names match the camelCase convention; the original
   space/paren-separated CSV headers are mapped in services/chipOwners.ts.
   ───────────────────────────────────────────────────────────── */

/** Single row of `cumulative_by_designer.csv`. */
export interface ChipOwnerRow {
  name: string;
  manufacturer: ChipManufacturer | string;
  owner: ChipOwner | string;
  startDate: string;
  endDate: string;
  /** Compute estimate in H100e (median). */
  h100eMedian: number;
  h100e5: number;
  h100e95: number;
  unitsMedian: number;
  units5: number;
  units95: number;
  /** Power draw in MW (median). Only on the designer CSV. */
  powerMwMedian: number;
  powerMw5: number;
  powerMw95: number;
  source: string | null;
  notes: string | null;
  incomplete: boolean | null;
}

/** Single row of `quarters_by_chip_type.csv` or `cumulative_by_chip_type.csv`. */
export interface ChipTypeRow {
  name: string;
  manufacturer: ChipManufacturer | string;
  owner: ChipOwner | string;
  chipType: string;
  startDate: string;
  endDate: string;
  h100eMedian: number;
  h100e5: number;
  h100e95: number;
  units: number;
  units5: number;
  units95: number;
  /** Total thermal design power in WATTS. Convert to MW for display. */
  totalTdpW: number;
  totalTdpW5: number;
  totalTdpW95: number;
  source: string | null;
  notes: string | null;
  incomplete: boolean | null;
}

/* ─────────────────────────────────────────────────────────────
   Derived shapes — what the UI consumes.
   ───────────────────────────────────────────────────────────── */

/** Single owner's headline numbers at the latest cumulative quarter. */
export interface OwnerSnapshot {
  owner: ChipOwner | string;
  /** End-of-quarter ISO date for this snapshot. */
  asOf: string;
  /** Total cumulative H100e across all chip types. */
  h100e: number;
  h100eLow: number;
  h100eHigh: number;
  /** Total cumulative chip count across all chip types. */
  units: number;
  /** Total cumulative power in MW across all chip types. */
  powerMw: number;
  /** Per-chip-type breakdown for this owner at the same quarter. */
  byChipType: ChipTypeSnapshot[];
}

/** Per-(owner, chip type) snapshot at the latest cumulative quarter. */
export interface ChipTypeSnapshot {
  chipType: string;
  manufacturer: string;
  h100e: number;
  units: number;
  powerMw: number;
}

/** Time-series point: one quarter, one h100e value per owner. */
export interface OwnerQuarterPoint {
  /** End-of-quarter ISO date (e.g. "2024-03-31"). */
  endDate: string;
  /** Display label (e.g. "Q1 2024"). */
  label: string;
  /** owner → cumulative h100e at this quarter end. */
  byOwner: Record<string, number>;
}

/**
 * The fully-parsed and pre-aggregated dataset. This is what
 * `useEpochChipOwners` returns and what the slice caches.
 */
export interface EpochChipOwnersData {
  /** Flat parsed rows from `cumulative_by_designer.csv`. */
  cumulativeByDesigner: ChipOwnerRow[];
  /** Flat parsed rows from `quarters_by_chip_type.csv`. */
  quartersByChipType: ChipTypeRow[];
  /** Flat parsed rows from `cumulative_by_chip_type.csv`. */
  cumulativeByChipType: ChipTypeRow[];

  /** Latest cumulative snapshot, one entry per owner. */
  latestByOwner: OwnerSnapshot[];

  /**
   * Cumulative H100e per owner across every observed quarter.
   * Sorted ascending by `endDate`. Used for line/area time series.
   */
  timeseries: OwnerQuarterPoint[];

  /** Distinct sorted lists for UI controls. */
  owners: string[];
  chipTypes: string[];
  manufacturers: string[];

  /** Latest end-date observed in any cumulative row (the "as of" stamp). */
  asOf: string;

  /** ISO timestamp of when WE downloaded + parsed the ZIP. */
  fetchedAt: string;

  /** Compressed ZIP byte size — surfaced for the data banner. */
  zipBytes: number;
}
