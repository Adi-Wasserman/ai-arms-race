import JSZip from 'jszip';
import Papa from 'papaparse';

import type {
  ChipOwnerRow,
  ChipTypeRow,
  ChipTypeSnapshot,
  EpochChipOwnersData,
  OwnerQuarterPoint,
  OwnerSnapshot,
} from '@/types';

/**
 * Live source of truth for the AI Chip Owners dataset. Always the most
 * recent ZIP — Epoch overwrites this URL on each release.
 */
export const EPOCH_CHIP_OWNERS_URL = 'https://epoch.ai/data/ai_chip_owners.zip';

/** Same proxy chain `services/epoch.ts` uses for the data center CSVs. */
const CORS_PROXIES: readonly string[] = [
  '',
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

const PER_ATTEMPT_MS = 8000;

/* ─────────────────────────────────────────────────────────────
   Network — binary fetch with CORS-proxy fallback
   ───────────────────────────────────────────────────────────── */

/**
 * Fetch the ZIP as an ArrayBuffer, retrying through direct + each
 * CORS proxy in order. Mirrors `fetchWithFallback` from
 * `services/epoch.ts` but returns binary instead of text.
 */
export async function fetchChipOwnersZip(): Promise<{
  buffer: ArrayBuffer;
  via: string;
}> {
  const url = EPOCH_CHIP_OWNERS_URL;
  let lastErr: unknown = null;

  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const prefix = CORS_PROXIES[i];
    const fetchUrl = prefix ? prefix + encodeURIComponent(url) : url;
    const via = prefix || 'direct';

    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), PER_ATTEMPT_MS);
    const opts: RequestInit = { mode: 'cors' };
    if (controller) opts.signal = controller.signal;

    try {
      const res = await fetch(fetchUrl, opts);
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 1024) {
        throw new Error(`Suspiciously small response: ${buffer.byteLength} bytes`);
      }
      console.log(
        `[chipOwners] Fetched ai_chip_owners.zip via ${via} (${buffer.byteLength} bytes)`,
      );
      return { buffer, via };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[chipOwners] Attempt ${i + 1} (${via}) failed: ${msg}`);
    }
  }

  throw new Error(
    `[chipOwners] All ${CORS_PROXIES.length} fetch attempts failed: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

/* ─────────────────────────────────────────────────────────────
   Parsing — JSZip + PapaParse, no hard-coded filenames
   ───────────────────────────────────────────────────────────── */

type RawCsvRow = Record<string, string | number | boolean | null>;

/** Map an Epoch column header to a numeric value (handles null/undefined). */
function num(row: RawCsvRow, key: string): number {
  const v = row[key];
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(row: RawCsvRow, key: string): string {
  const v = row[key];
  return v == null ? '' : String(v);
}

function strOrNull(row: RawCsvRow, key: string): string | null {
  const v = row[key];
  if (v == null || v === '') return null;
  return String(v);
}

function boolOrNull(row: RawCsvRow, key: string): boolean | null {
  const v = row[key];
  if (v == null || v === '') return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (s === 'true' || s === 'yes' || s === '1') return true;
  if (s === 'false' || s === 'no' || s === '0') return false;
  return null;
}

/** `cumulative_by_designer.csv` row → typed `ChipOwnerRow`. */
function parseDesignerRow(row: RawCsvRow): ChipOwnerRow {
  return {
    name: str(row, 'Name'),
    manufacturer: str(row, 'Chip manufacturer'),
    owner: str(row, 'Owner'),
    startDate: str(row, 'Start date'),
    endDate: str(row, 'End date'),
    h100eMedian: num(row, 'Compute estimate in H100e (median)'),
    h100e5: num(row, 'H100e (5th percentile)'),
    h100e95: num(row, 'H100e (95th percentile)'),
    unitsMedian: num(row, 'Number of Units (median)'),
    units5: num(row, 'Number of Units (5th percentile)'),
    units95: num(row, 'Number of Units (95th percentile)'),
    powerMwMedian: num(row, 'Power in MW (median)'),
    powerMw5: num(row, 'Power in MW (5th percentile)'),
    powerMw95: num(row, 'Power in MW (95th percentile)'),
    source: strOrNull(row, 'Source / Link'),
    notes: strOrNull(row, 'Notes'),
    incomplete: boolOrNull(row, 'Incomplete'),
  };
}

/**
 * Either chip-type CSV row → typed `ChipTypeRow`. The two files have
 * very similar columns; the cumulative CSV has `Number of Units (median)`
 * while the quarters CSV has `Number of Units` — handle both.
 */
function parseChipTypeRow(row: RawCsvRow): ChipTypeRow {
  return {
    name: str(row, 'Name'),
    manufacturer: str(row, 'Chip manufacturer'),
    owner: str(row, 'Owner'),
    chipType: str(row, 'Chip type'),
    startDate: str(row, 'Start date'),
    endDate: str(row, 'End date'),
    h100eMedian: num(row, 'Compute estimate in H100e (median)'),
    h100e5: num(row, 'H100e (5th percentile)'),
    h100e95: num(row, 'H100e (95th percentile)'),
    units:
      'Number of Units (median)' in row
        ? num(row, 'Number of Units (median)')
        : num(row, 'Number of Units'),
    units5: num(row, 'Number of Units (5th percentile)'),
    units95: num(row, 'Number of Units (95th percentile)'),
    totalTdpW: num(row, 'Total TDP (W)'),
    totalTdpW5: num(row, 'Total TDP (W) (5th percentile)'),
    totalTdpW95: num(row, 'Total TDP (W) (95th percentile)'),
    source: strOrNull(row, 'Source / Link'),
    notes: strOrNull(row, 'Notes'),
    incomplete: boolOrNull(row, 'Incomplete'),
  };
}

function parseCsvText<T>(text: string, mapRow: (row: RawCsvRow) => T): T[] {
  const result = Papa.parse<RawCsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  if (result.errors.length > 0) {
    console.warn(
      `[chipOwners] CSV parse errors: ${result.errors.length}`,
      result.errors.slice(0, 3),
    );
  }
  return result.data.map(mapRow);
}

/* ─────────────────────────────────────────────────────────────
   Derived shapes — latest snapshot + time series
   ───────────────────────────────────────────────────────────── */

function quarterLabel(endDate: string): string {
  // endDate is "YYYY-MM-DD" of a quarter end (03-31, 06-30, 09-30, 12-31).
  const [y, m] = endDate.split('-');
  const month = Number(m);
  const q = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;
  return `Q${q} ${y}`;
}

/**
 * Build the latest cumulative snapshot per owner from
 * `cumulative_by_chip_type.csv`. Sums every chip type's H100e + units +
 * power for the most recent end-date that owner has data for.
 */
function buildLatestByOwner(
  cumulativeByChipType: ChipTypeRow[],
): OwnerSnapshot[] {
  // Group rows by owner.
  const byOwner = new Map<string, ChipTypeRow[]>();
  for (const r of cumulativeByChipType) {
    if (!r.owner) continue;
    const list = byOwner.get(r.owner);
    if (list) list.push(r);
    else byOwner.set(r.owner, [r]);
  }

  const snapshots: OwnerSnapshot[] = [];
  for (const [owner, rows] of byOwner) {
    // Find this owner's latest end date.
    let asOf = rows[0].endDate;
    for (const r of rows) {
      if (r.endDate > asOf) asOf = r.endDate;
    }
    // Sum every chip-type row in that latest quarter.
    const latestRows = rows.filter((r) => r.endDate === asOf);
    let h100e = 0;
    let h100eLow = 0;
    let h100eHigh = 0;
    let units = 0;
    let totalTdpW = 0;
    const byChipType: ChipTypeSnapshot[] = [];
    for (const r of latestRows) {
      h100e += r.h100eMedian;
      h100eLow += r.h100e5;
      h100eHigh += r.h100e95;
      units += r.units;
      totalTdpW += r.totalTdpW;
      byChipType.push({
        chipType: r.chipType,
        manufacturer: r.manufacturer,
        h100e: r.h100eMedian,
        units: r.units,
        powerMw: r.totalTdpW / 1_000_000,
      });
    }
    byChipType.sort((a, b) => b.h100e - a.h100e);
    snapshots.push({
      owner,
      asOf,
      h100e: Math.round(h100e),
      h100eLow: Math.round(h100eLow),
      h100eHigh: Math.round(h100eHigh),
      units: Math.round(units),
      powerMw: totalTdpW / 1_000_000,
      byChipType,
    });
  }

  // Sort owners by H100e descending so the leaderboard is the natural order.
  snapshots.sort((a, b) => b.h100e - a.h100e);
  return snapshots;
}

/**
 * Build a quarter-by-quarter cumulative time series. For each unique
 * end date, emits one point with the cumulative H100e per owner at
 * that quarter (summed across every chip type).
 */
function buildTimeseries(cumulativeByChipType: ChipTypeRow[]): OwnerQuarterPoint[] {
  // Group by endDate.
  const byDate = new Map<string, ChipTypeRow[]>();
  for (const r of cumulativeByChipType) {
    const list = byDate.get(r.endDate);
    if (list) list.push(r);
    else byDate.set(r.endDate, [r]);
  }
  const dates = Array.from(byDate.keys()).sort();

  return dates.map((endDate) => {
    const rows = byDate.get(endDate) ?? [];
    const byOwner: Record<string, number> = {};
    for (const r of rows) {
      if (!r.owner) continue;
      byOwner[r.owner] = (byOwner[r.owner] ?? 0) + r.h100eMedian;
    }
    return { endDate, label: quarterLabel(endDate), byOwner };
  });
}

/**
 * Distill a `JSZip` archive into the typed `EpochChipOwnersData` shape.
 * Iterates every entry and parses by **filename suffix**, not by
 * hard-coded names — so future Epoch releases that add a new CSV won't
 * break us, they'll just be ignored.
 */
export async function parseChipOwnersZip(
  buffer: ArrayBuffer,
): Promise<EpochChipOwnersData> {
  const zip = await JSZip.loadAsync(buffer);

  let cumulativeByDesigner: ChipOwnerRow[] = [];
  let quartersByChipType: ChipTypeRow[] = [];
  let cumulativeByChipType: ChipTypeRow[] = [];

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    if (!entry.name.toLowerCase().endsWith('.csv')) continue;
    const text = await entry.async('text');

    const lower = entry.name.toLowerCase();
    if (lower.includes('cumulative_by_designer')) {
      cumulativeByDesigner = parseCsvText(text, parseDesignerRow);
    } else if (lower.includes('quarters_by_chip_type')) {
      quartersByChipType = parseCsvText(text, parseChipTypeRow);
    } else if (lower.includes('cumulative_by_chip_type')) {
      cumulativeByChipType = parseCsvText(text, parseChipTypeRow);
    } else {
      console.warn(`[chipOwners] Unknown CSV in ZIP: ${entry.name} — ignored`);
    }
  }

  const latestByOwner = buildLatestByOwner(cumulativeByChipType);
  const timeseries = buildTimeseries(cumulativeByChipType);

  // Distinct lists.
  const ownerSet = new Set<string>();
  const chipSet = new Set<string>();
  const mfrSet = new Set<string>();
  for (const r of cumulativeByChipType) {
    ownerSet.add(r.owner);
    chipSet.add(r.chipType);
    mfrSet.add(r.manufacturer);
  }
  for (const r of cumulativeByDesigner) {
    ownerSet.add(r.owner);
    mfrSet.add(r.manufacturer);
  }

  // Latest end date across the dataset = "as of" stamp.
  let asOf = '';
  for (const r of cumulativeByChipType) {
    if (r.endDate > asOf) asOf = r.endDate;
  }

  return {
    cumulativeByDesigner,
    quartersByChipType,
    cumulativeByChipType,
    latestByOwner,
    timeseries,
    owners: Array.from(ownerSet).sort(),
    chipTypes: Array.from(chipSet).sort(),
    manufacturers: Array.from(mfrSet).sort(),
    asOf,
    fetchedAt: new Date().toISOString(),
    zipBytes: buffer.byteLength,
  };
}

/* ─────────────────────────────────────────────────────────────
   localStorage cache (24h TTL)
   ───────────────────────────────────────────────────────────── */

export const CHIP_OWNERS_CACHE_KEY = 'epochChipOwnersCache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEnvelope {
  cachedAt: string;
  data: EpochChipOwnersData;
}

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/** Read the cached payload, or null if missing / stale / unparseable. */
export function readChipOwnersCache(): {
  data: EpochChipOwnersData;
  cachedAt: string;
  stale: boolean;
} | null {
  if (!isLocalStorageAvailable()) return null;
  const raw = window.localStorage.getItem(CHIP_OWNERS_CACHE_KEY);
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as CacheEnvelope;
    if (!env?.cachedAt || !env?.data) return null;
    const ageMs = Date.now() - new Date(env.cachedAt).getTime();
    return { data: env.data, cachedAt: env.cachedAt, stale: ageMs > CACHE_TTL_MS };
  } catch (err) {
    console.warn('[chipOwners] cache parse failed — discarding', err);
    try {
      window.localStorage.removeItem(CHIP_OWNERS_CACHE_KEY);
    } catch {
      /* quota / private mode — ignore */
    }
    return null;
  }
}

export function writeChipOwnersCache(data: EpochChipOwnersData): void {
  if (!isLocalStorageAvailable()) return;
  const env: CacheEnvelope = { cachedAt: new Date().toISOString(), data };
  try {
    window.localStorage.setItem(CHIP_OWNERS_CACHE_KEY, JSON.stringify(env));
  } catch (err) {
    // Quota errors, Safari private mode, etc. — non-fatal.
    console.warn('[chipOwners] cache write failed', err);
  }
}

export function clearChipOwnersCache(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.removeItem(CHIP_OWNERS_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/* ─────────────────────────────────────────────────────────────
   High-level orchestration: cache → fetch → parse → cache
   ───────────────────────────────────────────────────────────── */

export interface LoadChipOwnersResult {
  data: EpochChipOwnersData;
  source: 'cache-fresh' | 'cache-stale-fallback' | 'network';
}

/**
 * One-shot loader. Returns immediately from cache if it's fresh
 * (< 24h), otherwise hits the network. On network failure with a
 * stale cache present, returns the stale cache rather than throwing.
 */
export async function loadChipOwnershipData(
  options: { forceRefresh?: boolean } = {},
): Promise<LoadChipOwnersResult> {
  const { forceRefresh = false } = options;

  // 1. Cache hit + fresh → return immediately.
  if (!forceRefresh) {
    const cached = readChipOwnersCache();
    if (cached && !cached.stale) {
      console.log(
        `[chipOwners] Cache fresh (${cached.cachedAt}) — skipping network`,
      );
      return { data: cached.data, source: 'cache-fresh' };
    }
  }

  // 2. Network fetch.
  try {
    const { buffer } = await fetchChipOwnersZip();
    const data = await parseChipOwnersZip(buffer);
    writeChipOwnersCache(data);
    console.log(
      `[chipOwners] Parsed: ${data.latestByOwner.length} owners, ${data.chipTypes.length} chip types, as of ${data.asOf}`,
    );
    return { data, source: 'network' };
  } catch (err) {
    // 3. Network failed — fall back to stale cache if we have one.
    const cached = readChipOwnersCache();
    if (cached) {
      console.warn(
        `[chipOwners] Network failed, serving STALE cache (${cached.cachedAt})`,
        err,
      );
      return { data: cached.data, source: 'cache-stale-fallback' };
    }
    // 4. No cache and no network — propagate.
    throw err;
  }
}
