import type { Lab, LabOrOther } from './lab';

/** Stable handle used as the primary key for a facility. */
export type FacilityHandle = string;

/** [latitude, longitude] tuple. */
export type Coordinates = readonly [number, number];

export type FacilityStatus = 'operational' | 'building' | 'planned' | 'unknown';

/** Single row of the hardcoded fallback timeline: [date, handle, h100e, powerMW]. */
export type TimelineEntry = readonly [
  date: string,
  handle: FacilityHandle,
  h100e: number,
  powerMW: number,
];

/** Cloud-lease fleet row: [date, legHandle, h100e, powerMW]. */
export type FleetEntry = readonly [
  date: string,
  handle: FacilityHandle,
  h100e: number,
  powerMW: number,
];

export interface ObservationBadge {
  icon: string;
  category: string;
  value: string;
  meta: string;
  signal: '+' | '-' | '';
}

/** Maps a facility handle → its parent lab (or "Other"). */
export type LabMap = Record<FacilityHandle, LabOrOther>;

export type FacilityCoordsMap = Readonly<Record<FacilityHandle, Coordinates>>;

export type TrackedLab = Lab;

/* ─────────────────────────────────────────────────────────────
   Raw Epoch AI shapes — what the services layer operates on.
   Field names (`handle`, `co`, `h`, `pw`, `cs`, `pj`, `st`) match
   the legacy HTML so ported logic stays 1:1.
   ───────────────────────────────────────────────────────────── */

/** Epoch confidence tag extracted from the Users / Owner columns. */
export type ConfidenceTag = 'confident' | 'likely' | 'speculative' | 'unknown';

/** A single parsed row from the Epoch data_centers.csv file. */
export interface EpochDataCenter {
  handle: FacilityHandle;
  title: string;
  /** Project / codename (e.g. "Stargate", "Fairwater"). */
  pj: string;
  /** Parent lab (classified from users/owner columns). */
  co: LabOrOther;
  conf?: ConfidenceTag;
  /** Current H100-equivalent chip count. */
  h: number;
  /** Current power draw in MW. */
  pw: number;
  /** Total capital cost (2025 USD billions). */
  cs: number;
  lat: number | null;
  lon: number | null;
}

/** A single row from Epoch's data_center_timelines.csv. */
export interface EpochTimelineEvent {
  date: string;
  dc: FacilityHandle;
  /** Status / observation text string from satellite entries. */
  st: string;
  h: number;
  p: number;
  buildings: number;
}

/** Simplified entry used for cumulative time series aggregation. */
export interface EpochDataEntry {
  date: string;
  dc: FacilityHandle;
  h: number;
  p: number;
}

/** Output of `parseEpochData` / `buildFallbackData`. */
export interface EpochParsedData {
  labMap: LabMap;
  dataCenters: EpochDataCenter[];
  timeline: EpochTimelineEvent[];
  entries: EpochDataEntry[];
}

/** Raw CSV rows as returned from PapaParse. */
export type CsvValue = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvValue>;

/** Output of `fetchEpoch`. */
export interface EpochRawData {
  dcRows: CsvRow[];
  tlRows: CsvRow[];
  /** False if the data_centers.csv fetch failed (blocked by Cloudflare, etc). */
  dcAvailable: boolean;
}

/** Return shape of `scoreConfidence`. */
export interface ConfidenceResult {
  score: number;
  phase: number;
  label: string;
  color: string;
  powerPct: number;
  currentPower: number;
  maxPower: number;
  description: string;
  phaseLabel: string;
  finalDate: string | null;
  category: 'OP' | 'BLD' | 'PLN';
}
