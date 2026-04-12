import type { Lab } from './lab';

/* ─────────────────────────────────────────────────────────────
   UI state unions. Shared by store slices and hash-state sync.
   ───────────────────────────────────────────────────────────── */

export type MetricMode = 'h100e' | 'power';
export type ScopeMode = 'tracked' | 'fleet';
export type ProjMode = 'current' | '2029';

/**
 * Race section view mode.
 *
 *   "effective"  → existing time-series chart + leaderboard sidebar.
 *                  Shows compute that each lab has *access* to (their
 *                  own facilities + their cloud-lease allocations).
 *   "ownership"  → new table view sourced from Epoch's AI Chip Owners
 *                  ZIP. Shows who *bought* the chips, regardless of
 *                  who consumes them. Only meaningful when scope=fleet.
 */
export type RaceMode = 'effective' | 'ownership';

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
