import type { Coordinates, FacilityCoordsMap, LabMap } from '@/types';

/**
 * Handle → parent lab mapping. Used when the Epoch CSV fetch fails and as
 * the canonical source for the hardcoded fallback timeline.
 */
export const LAB_MAP: LabMap = {
  'Amazon Canton Mississippi': 'Anthropic',
  'Amazon Ridgeland Mississippi': 'Anthropic',
  'Anthropic-Amazon Project Rainier New Carlisle Indiana': 'Anthropic',
  'Crusoe Goodnight Texas': 'Gemini',
  'Google Pryor Oklahoma': 'Gemini',
  'Google New Albany Ohio': 'Gemini',
  'Google Omaha Nebraska': 'Gemini',
  'Google Cedar Rapids Iowa': 'Gemini',
  'Google Council Bluffs Iowa': 'Gemini',
  'Meta Hyperion Holly Ridge Louisiana': 'Meta',
  'Meta Prometheus New Albany Ohio': 'Meta',
  'Meta Temple Texas': 'Meta',
  'Microsoft Fairwater Fayetteville Georgia': 'OpenAI',
  'Microsoft Fairwater Mount Pleasant Wisconsin': 'OpenAI',
  'Microsoft Goodyear Arizona': 'OpenAI',
  'OpenAI-Oracle Stargate Abilene Texas': 'OpenAI',
  'OpenAI-Oracle Stargate Abu Dhabi': 'OpenAI',
  'OpenAI Stargate Shackelford': 'OpenAI',
  'xAI Colossus 1 Memphis Tennessee': 'xAI',
  'xAI Colossus 2 Memphis Tennessee': 'xAI',
  'Alibaba Zhangbei Zhangjiakou Hebei': 'Other',
  'Coreweave Helios Afton Texas': 'OpenAI',
  'QTS Cedar Rapids Iowa': 'Other',
  EGC: 'Gemini',
  EAI: 'Anthropic',
  'EAI-AWS': 'Anthropic',
  'EAI-GCP': 'Anthropic',
  'EAI-AZR': 'Anthropic',
};

/**
 * Verified-precise coordinate overrides for facilities where Epoch's
 * published lat/lon is noticeably off the actual building. Keyed by
 * Epoch's `Name` column. Applied at marker-build time before falling
 * back to `dc.lat / dc.lon` from the CSV.
 *
 * Add an entry here only when the Epoch-published point is obviously
 * wrong (>2 km from the real site) and you can verify the corrected
 * coordinate against satellite imagery or a building permit address.
 */
export const FACILITY_COORD_OVERRIDES: Readonly<Record<string, Coordinates>> = {
  // Epoch publishes 42°40'28"N 87°53'42"W → (42.6744, -87.895), which
  // lands ~5.5 km SSE of the Mount Pleasant campus near a stormwater
  // retention pond. The Microsoft Fairwater data hall is on the parcel
  // adjacent to Foxconn's Wisconn Valley site.
  'Microsoft Fairwater Wisconsin': [42.7236, -87.9281],
};

/**
 * Satellite coordinates [lat, lon] for every known facility handle.
 *
 * Keyed by BOTH the legacy long names (used by `RAW_TIMELINE` and the
 * fallback dataset) AND Epoch's current short names (the `Name` column
 * in their public CSV). Epoch removed `Latitude`/`Longitude` columns
 * from their CSV in early 2026 — there's no per-row coordinate to read
 * off `dc.lat` / `dc.lon` anymore, so this map is now the canonical
 * source for placing pins. Keeping both name forms means the live
 * Epoch path AND the local fallback path both resolve correctly.
 */
export const FACILITY_COORDS: FacilityCoordsMap = {
  // ── Long-name keys (RAW_TIMELINE / fallback dataset) ─────────
  'Amazon Canton Mississippi': [32.59, -90.09],
  'Amazon Ridgeland Mississippi': [32.4, -90.2],
  'Anthropic-Amazon Project Rainier New Carlisle Indiana': [41.69, -86.46],
  'Crusoe Goodnight Texas': [35.02, -101.31],
  'Google Pryor Oklahoma': [36.24, -95.33],
  'Google New Albany Ohio': [40.06, -82.76],
  'Google Omaha Nebraska': [41.34, -96.09],
  'Google Cedar Rapids Iowa': [41.92, -91.72],
  'Google Council Bluffs Iowa': [41.17, -95.79],
  'Meta Hyperion Holly Ridge Louisiana': [32.5, -91.64],
  'Meta Prometheus New Albany Ohio': [40.07, -82.75],
  'Meta Temple Texas': [31.13, -97.37],
  'Microsoft Fairwater Fayetteville Georgia': [33.45, -84.52],
  'Microsoft Fairwater Mount Pleasant Wisconsin': [42.67, -87.9],
  'Microsoft Goodyear Arizona': [33.41, -112.37],
  'OpenAI-Oracle Stargate Abilene Texas': [32.5, -99.78],
  'OpenAI-Oracle Stargate Abu Dhabi': [24.15, 54.44],
  'OpenAI Stargate Shackelford': [32.55, -99.56],
  'xAI Colossus 1 Memphis Tennessee': [35.06, -90.16],
  'xAI Colossus 2 Memphis Tennessee': [34.99, -90.03],
  'Coreweave Helios Afton Texas': [33.77, -100.87],

  // ── Epoch CSV short-name aliases (live dataset) ──────────────
  'Anthropic-Amazon New Carlisle': [41.69, -86.46],
  'Meta Prometheus': [40.07, -82.75],
  'Microsoft Fairwater Wisconsin': [42.67, -87.9],
  'OpenAI Stargate Abilene': [32.5, -99.78],
  'Microsoft Fairwater Atlanta': [33.45, -84.52],
  'xAI Colossus 1': [35.06, -90.16],
  'xAI Colossus 2': [34.99, -90.03],
  'Amazon Madison Mega Site': [32.59, -90.09],
  'Google New Albany': [40.06, -82.76],
  'Microsoft Goodyear': [33.41, -112.37],
  'Meta Temple': [31.13, -97.37],
  'Google Council Bluffs (East)': [41.17, -95.79],
  'Google Cedar Rapids': [41.92, -91.72],
  'Google Omaha': [41.34, -96.09],
  'Google Pryor (North)': [36.24, -95.33],
  'Meta Hyperion': [32.5, -91.64],
  'Amazon Ridgeland': [32.4, -90.2],
  'OpenAI Stargate UAE': [24.15, 54.44],
  'Crusoe Abilene Expansion': [32.49, -99.79],
  'Goodnight': [35.02, -101.31],
  // Coreweave + Fluidstack are owned by neutral GPU clouds but their
  // Users column attributes them to tracked labs (Microsoft/OpenAI and
  // Anthropic respectively), so they appear on the map.
  'Coreweave Helios': [33.77, -100.87],
  'Fluidstack Lake Mariner': [43.358, -78.604], // Somerset, NY (former Kintigh/AES site)
};
