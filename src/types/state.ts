import type { Lab } from './lab';

/* ─────────────────────────────────────────────────────────────
   UI state unions. Shared by store slices and hash-state sync.
   ───────────────────────────────────────────────────────────── */

export type MetricMode = 'h100e' | 'power';
export type ScopeMode = 'tracked' | 'fleet';
export type ProjMode = 'current' | '2029';
export type VelocityMode = 'absolute' | 'velocity';

/** "ALL" or a single lab name. */
export type LabFilter = 'ALL' | Lab;

/** Intel table status filter. */
export type StatusFilter = 'ALL' | 'OP' | 'BLD' | 'PLN';

/** All sortable columns in the Intel table. */
export type SortBy =
  | 'rank'
  | 'status'
  | 'name'
  | 'lab'
  | 'conf'
  | 'power'
  | 'peak'
  | 'h100e'
  | 'cost'
  | 'obs';

export type SortDir = 'asc' | 'desc';

export type ScatterView = 'observed' | 'projected';

export type RegionKey = 'all' | 'us' | 'uae';
