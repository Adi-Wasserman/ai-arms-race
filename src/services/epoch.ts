import Papa from 'papaparse';

import type {
  CsvRow,
  CsvValue,
  EpochDataCenter,
  EpochDataEntry,
  EpochParsedData,
  EpochRawData,
  EpochTimelineEvent,
  LabMap,
  LabOrOther,
  TimelineEntry,
} from '@/types';
import { classifyLab, extractConfidence } from './classify';

/* ─────────────────────────────────────────────────────────────
   URLs + fetch stack
   ───────────────────────────────────────────────────────────── */

const EPOCH_DC_URL = 'https://epoch.ai/data/data_centers/data_centers.csv';
const EPOCH_TL_URL = 'https://epoch.ai/data/data_centers/data_center_timelines.csv';

/** Direct first, then public CORS proxies as fallbacks. */
const CORS_PROXIES: readonly string[] = [
  '',
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

const PER_ATTEMPT_MS = 4000;

function looksLikeCsv(text: string): boolean {
  return (
    text.length >= 100 &&
    (text.includes('Handle') || text.includes('Date') || text.includes('Name'))
  );
}

/**
 * Fetch a URL, retrying through direct + each CORS proxy in order.
 * Rejects only if every attempt fails.
 */
export function fetchWithFallback(url: string): Promise<string> {
  let attempt = 0;

  const tryNext = (): Promise<string> => {
    if (attempt >= CORS_PROXIES.length) {
      return Promise.reject(new Error(`All fetch attempts failed for ${url}`));
    }
    const prefix = CORS_PROXIES[attempt];
    const fetchUrl = prefix ? prefix + encodeURIComponent(url) : url;
    attempt++;

    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), PER_ATTEMPT_MS);
    const opts: RequestInit = { mode: 'cors' };
    if (controller) opts.signal = controller.signal;

    return fetch(fetchUrl, opts)
      .then((r) => {
        clearTimeout(timer);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!looksLikeCsv(text)) throw new Error('Invalid CSV response');
        console.log(
          `[Epoch] Fetched ${url.split('/').pop()} via ${prefix || 'direct'} (${text.length} bytes)`,
        );
        return text;
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[Epoch] Attempt ${attempt} failed for ${url.split('/').pop()}: ${msg}`,
        );
        return tryNext();
      });
  };

  return tryNext();
}

/**
 * Fetch both CSVs. If the data_centers CSV is blocked by Cloudflare but
 * the timelines CSV succeeds, returns with `dcAvailable: false` so the
 * caller can derive DCs from the timeline + fallback metadata.
 */
export function fetchEpoch(): Promise<EpochRawData> {
  const dcPromise = fetchWithFallback(EPOCH_DC_URL).catch(
    () => null as string | null,
  );
  const tlPromise = fetchWithFallback(EPOCH_TL_URL);

  return Promise.all([dcPromise, tlPromise]).then(([dcText, tlText]) => {
    let dcRows: CsvRow[] = [];
    if (dcText) {
      const dcParsed = Papa.parse<CsvRow>(dcText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });
      dcRows = dcParsed.data;
      if (dcParsed.errors.length > 0) {
        console.warn('[Epoch] DC parse errors:', dcParsed.errors.slice(0, 3));
      }
      console.log(
        `[Epoch] DC CSV: ${dcRows.length} rows — columns: ${
          dcRows[0] ? Object.keys(dcRows[0]).join(', ') : 'none'
        }`,
      );
    } else {
      console.log(
        '[Epoch] DC CSV unavailable (Cloudflare) — will derive from timelines + fallback metadata',
      );
    }

    const tlParsed = Papa.parse<CsvRow>(tlText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    const tlRows = tlParsed.data;
    if (tlParsed.errors.length > 0) {
      console.warn('[Epoch] TL parse errors:', tlParsed.errors.slice(0, 3));
    }
    console.log(`[Epoch] TL CSV: ${tlRows.length} rows`);

    return { dcRows, tlRows, dcAvailable: !!dcText };
  });
}

/* ─────────────────────────────────────────────────────────────
   CSV row helpers
   ───────────────────────────────────────────────────────────── */

/**
 * Flexible column resolver. Tries each candidate header name in order,
 * then falls back to a substring-match scan across all row keys. Used to
 * absorb Epoch's occasional column renames.
 */
export function col(row: CsvRow, candidates: readonly string[], fallback?: CsvValue): CsvValue {
  for (const c of candidates) {
    const v = row[c];
    if (v != null && v !== '') return v;
  }
  // Fuzzy: check all keys for substring match in either direction.
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const c = cand.toLowerCase();
    for (const k of keys) {
      const kl = k.toLowerCase();
      if (kl.includes(c) || c.includes(kl)) {
        const v = row[k];
        if (v != null && v !== '') return v;
      }
    }
  }
  return fallback !== undefined ? fallback : null;
}

function colString(row: CsvRow, candidates: readonly string[], fallback = ''): string {
  const v = col(row, candidates, fallback);
  return v == null ? '' : String(v);
}

function colNumber(row: CsvRow, candidates: readonly string[]): number {
  const v = col(row, candidates, 0);
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Convert DMS ("32°30'00\"N") or a decimal number to decimal degrees. */
export function dmsToDecimal(dms: CsvValue): number | null {
  if (typeof dms === 'number') return dms;
  if (!dms || typeof dms !== 'string') return null;
  const m = dms.match(/(\d+)[°](\d+)[''′](\d+(?:\.\d+)?)[""″]?\s*([NSEW])/i);
  if (!m) {
    const n = parseFloat(dms);
    return Number.isNaN(n) ? null : n;
  }
  let dec = parseInt(m[1], 10) + parseInt(m[2], 10) / 60 + parseFloat(m[3]) / 3600;
  const dir = m[4].toUpperCase();
  if (dir === 'S' || dir === 'W') dec = -dec;
  return dec;
}

/* ─────────────────────────────────────────────────────────────
   Parsing
   ───────────────────────────────────────────────────────────── */

const DC_HANDLE = ['Handle', 'handle', 'Name'];
const DC_TITLE = ['Title', 'title', 'Display Name', 'Data center'];
const DC_PROJECT = ['Project', 'project'];
const DC_OWNER = ['Owner', 'owner'];
const DC_USERS = ['Users', 'users', 'Primary users'];
const DC_H100E = ['Current H100 equivalents', 'H100 equivalents', 'Current H100e', 'H100e'];
const DC_POWER = ['Current power (MW)', 'Power (MW)', 'Current power'];
const DC_COST = [
  'Current total capital cost (2025 USD billions)',
  'Total capital cost (2025 USD billions)',
  'Capital cost',
];
const DC_LAT = ['Latitude', 'latitude', 'lat'];
const DC_LON = ['Longitude', 'longitude', 'lon', 'lng'];

const TL_DATE = ['Date', 'date'];
const TL_DC = ['Data center', 'data center', 'Handle', 'handle'];
const TL_STATUS = ['Construction status', 'construction status', 'Status'];
const TL_H100E = ['H100 equivalents', 'H100e', 'h100e'];
const TL_POWER = ['Power (MW)', 'power (MW)', 'Power'];
const TL_BLDGS = ['Buildings operational', 'buildings operational', 'Buildings'];

/**
 * Parse raw Epoch CSV rows into app-ready structures.
 */
export function parseEpochData(
  dcRows: readonly CsvRow[],
  tlRows: readonly CsvRow[],
): EpochParsedData {
  const labMap: LabMap = {};
  for (const r of dcRows) {
    const handle = colString(r, DC_HANDLE);
    if (handle) {
      labMap[handle] = classifyLab(colString(r, DC_USERS), colString(r, DC_OWNER));
    }
  }
  // Known cloud-lease legs.
  labMap.EGC = 'Gemini';
  labMap.EAI = 'Anthropic';
  labMap['EAI-AWS'] = 'Anthropic';
  labMap['EAI-GCP'] = 'Anthropic';
  labMap['EAI-AZR'] = 'Anthropic';

  const dataCenters: EpochDataCenter[] = dcRows
    .filter((r) => colString(r, DC_HANDLE))
    .map((r) => {
      const handle = colString(r, DC_HANDLE);
      const lab: LabOrOther = labMap[handle] ?? 'Other';
      return {
        handle,
        title: colString(r, DC_TITLE) || handle,
        pj: colString(r, DC_PROJECT),
        co: lab,
        conf: extractConfidence(colString(r, DC_USERS), colString(r, DC_OWNER)),
        h: colNumber(r, DC_H100E),
        pw: colNumber(r, DC_POWER),
        cs: colNumber(r, DC_COST),
        lat: dmsToDecimal(col(r, DC_LAT)),
        lon: dmsToDecimal(col(r, DC_LON)),
      };
    });

  const timeline: EpochTimelineEvent[] = tlRows
    .filter((r) => colString(r, TL_DATE) && colString(r, TL_DC))
    .map((r) => ({
      date: colString(r, TL_DATE),
      dc: colString(r, TL_DC),
      st: colString(r, TL_STATUS),
      h: colNumber(r, TL_H100E),
      p: colNumber(r, TL_POWER),
      buildings: colNumber(r, TL_BLDGS),
    }));

  const entries: EpochDataEntry[] = tlRows
    .filter((r) => {
      const date = col(r, TL_DATE);
      const dc = col(r, TL_DC);
      const hRaw = col(r, TL_H100E);
      const pRaw = col(r, TL_POWER);
      const hasH = hRaw != null && hRaw !== '';
      const hasP = typeof pRaw === 'number' && pRaw > 0;
      return !!date && !!dc && (hasH || hasP);
    })
    .map((r) => ({
      date: colString(r, TL_DATE),
      dc: colString(r, TL_DC),
      h: colNumber(r, TL_H100E),
      p: colNumber(r, TL_POWER),
    }));

  console.log(
    `[Epoch] parseEpochData: ${dataCenters.length} DCs, ${timeline.length} timeline events, ${entries.length} entries, ${Object.keys(labMap).length} lab mappings`,
  );

  return { labMap, dataCenters, timeline, entries };
}

/**
 * Build the fallback dataset from the hardcoded raw timeline. Used when
 * every Epoch fetch attempt fails.
 */
export function buildFallbackData(
  rawTimeline: readonly TimelineEntry[],
  defaultLabMap: LabMap,
): EpochParsedData {
  const handles = new Set<string>();
  for (const r of rawTimeline) handles.add(r[1]);

  const dataCenters: EpochDataCenter[] = Array.from(handles).map((k) => {
    const rows = rawTimeline.filter((r) => r[1] === k);
    const last = rows[rows.length - 1];
    return {
      handle: k,
      title: k,
      pj: '',
      co: defaultLabMap[k] ?? 'Other',
      h: last[2],
      pw: last[3],
      cs: 0,
      lat: null,
      lon: null,
    };
  });

  const timeline: EpochTimelineEvent[] = rawTimeline.map((r) => ({
    date: r[0],
    dc: r[1],
    st: '',
    h: r[2],
    p: r[3],
    buildings: 0,
  }));

  const entries: EpochDataEntry[] = rawTimeline.map((r) => ({
    date: r[0],
    dc: r[1],
    h: r[2],
    p: r[3],
  }));

  return { labMap: { ...defaultLabMap }, dataCenters, timeline, entries };
}

/** Parse raw tuple rows (same shape as `RAW_TIMELINE`) into entry objects. */
export function parseRawRows(rows: readonly TimelineEntry[]): EpochDataEntry[] {
  return rows.map((r) => ({ date: r[0], dc: r[1], h: r[2], p: r[3] }));
}
