import type { Coordinates, FacilityCoordsMap, LabMap } from '@/types';

/**
 * Handle → parent lab mapping. Used when the Epoch CSV fetch fails and as
 * the canonical source for the hardcoded fallback timeline.
 */
export const LAB_MAP: LabMap = {
  // ── Legacy long names (RAW_TIMELINE fallback) ──────────────
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
  'xAI Colossus 1 Memphis Tennessee': 'xAI',
  'xAI Colossus 2 Memphis Tennessee': 'xAI',
  'Alibaba Zhangbei Zhangjiakou Hebei': 'Other',
  'Coreweave Helios Afton Texas': 'OpenAI',
  'QTS Cedar Rapids Iowa': 'Other',

  // ── Epoch CSV short names (live dataset, June 2026) ────────
  'Meta Prometheus': 'Meta',
  'Microsoft Fairwater Atlanta': 'OpenAI',
  'Anthropic-Amazon New Carlisle': 'Anthropic',
  'Colossus 2': 'xAI',
  'OpenAI Stargate Abilene': 'OpenAI',
  'QTS Richmond': 'Other',
  'Microsoft Fairwater Wisconsin': 'OpenAI',
  'Google Pryor (North)': 'Gemini',
  'DayOne Nusajaya': 'Other',
  'Colossus 1': 'xAI',
  'Google Columbus': 'Gemini',
  'Amazon Madison Mega Site': 'Anthropic',
  'Google New Albany': 'Gemini',
  'Microsoft Goodyear': 'OpenAI',
  'Meta Jeffersonville': 'Meta',
  'Meta Kuna': 'Meta',
  'Meta Temple': 'Meta',
  'Amazon Ridgeland': 'Anthropic',
  'Microsoft Project Osmium': 'OpenAI',
  'Google Omaha': 'Gemini',
  'Alibaba Zhangbei': 'Other',
  'Google Lincoln': 'Gemini',
  'CoreWeave Denton TX': 'Other',
  'Google The Dalles': 'Gemini',
  'Fluidstack Lake Mariner': 'Anthropic',
  'Google Council Bluffs (East)': 'Gemini',
  'Google Storey County': 'Gemini',
  'Oracle Batam': 'Other',
  'Google Papillion': 'Gemini',
  'CoreWeave Marble NC': 'Other',
  'Microsoft SAT40': 'OpenAI',
  'STACK Infrastructure NVA02': 'Other',
  'Google Midlothian': 'Gemini',
  'Google Red Oak': 'Gemini',
  'Stream Phoenix': 'Other',
  'Microsoft SAT14': 'OpenAI',
  'Vantage TX1': 'Other',
  'Start Campus Sines Data Campus': 'Other',
  'Meta Hyperion': 'Meta',
  'Goodnight': 'Gemini',
  'OpenAI Stargate UAE': 'OpenAI',
  'Coreweave Helios': 'OpenAI',
  'Google Cedar Rapids': 'Gemini',
  'QTS Cedar Rapids': 'Other',
  'OpenAI Stargate Shackelford': 'OpenAI',
  'Google Fort Wayne': 'Gemini',
  'Crusoe Abilene Expansion': 'OpenAI',
  'OpenAI Stargate Lordstown': 'OpenAI',
  'OpenAI Stargate New Mexico': 'OpenAI',
  'OpenAI Stargate Wisconsin': 'OpenAI',
  'OpenAI Stargate Michigan': 'OpenAI',
  'OpenAI Stargate Milam': 'OpenAI',
  'Meta Rosemount': 'Meta',
  'Google Kansas City East': 'Gemini',

  // ── Cloud-lease virtual handles ────────────────────────────
  EGC: 'Gemini',
  EAI: 'Anthropic',
  'EAI-AWS': 'Anthropic',
  'EAI-GCP': 'Anthropic',
  'EAI-AZR': 'Anthropic',
  // ── Colossus tenant allocation handles ─────────────────────
  'COL-ANT': 'Anthropic',
  'COL-GGL': 'Gemini',
  'COL-XAI-ADJ': 'xAI',
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

  // ── Epoch CSV short-name aliases (live dataset, June 2026) ──
  'Anthropic-Amazon New Carlisle': [41.69, -86.46],
  'Meta Prometheus': [40.07, -82.75],
  'Microsoft Fairwater Wisconsin': [42.67, -87.9],
  'OpenAI Stargate Abilene': [32.5, -99.78],
  'Microsoft Fairwater Atlanta': [33.45, -84.52],
  'Colossus 1': [35.06, -90.16],
  'Colossus 2': [34.99, -90.03],
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
  'Coreweave Helios': [33.77, -100.87],
  'Fluidstack Lake Mariner': [43.358, -78.604],

  // ── New Epoch facilities (June 2026 update) ────────────────
  'QTS Richmond': [37.52, -77.31],        // Sandston, VA
  'DayOne Nusajaya': [1.46, 103.72],      // Nusajaya Tech Park, Malaysia
  'Google Columbus': [39.9, -82.97],      // S High St, Columbus, OH
  'Meta Jeffersonville': [38.29, -85.73], // Jeffersonville, IN
  'Meta Kuna': [43.49, -116.42],          // Kuna, ID
  'Microsoft Project Osmium': [41.49, -93.76], // Cumming, IA
  'Google Lincoln': [40.74, -96.68],      // Lincoln, NE
  'CoreWeave Denton TX': [33.25, -97.07], // Denton, TX
  'Google The Dalles': [45.6, -121.17],   // The Dalles, OR
  'Google Storey County': [39.56, -119.65], // Storey County, NV
  'Oracle Batam': [1.07, 104.05],         // Batam, Indonesia
  'Google Papillion': [41.15, -96.04],    // Papillion, NE
  'CoreWeave Marble NC': [35.16, -83.95], // Marble, NC
  'Microsoft SAT40': [29.43, -98.63],     // San Antonio, TX
  'STACK Infrastructure NVA02': [38.76, -77.52], // Manassas, VA
  'Google Midlothian': [32.48, -96.99],   // Midlothian, TX
  'Google Red Oak': [32.52, -96.81],      // Red Oak, TX
  'Stream Phoenix': [33.41, -112.4],      // Goodyear, AZ
  'Microsoft SAT14': [29.46, -98.6],      // San Antonio, TX
  'Vantage TX1': [33.41, -112.37],        // Goodyear, AZ
  'Start Campus Sines Data Campus': [37.95, -8.87], // Sines, Portugal
  'Google Fort Wayne': [41.03, -85.13],   // Fort Wayne, IN
  'OpenAI Stargate Lordstown': [41.17, -80.87], // Warren, OH
  'OpenAI Stargate New Mexico': [32.35, -106.75], // Dona Ana, NM
  'OpenAI Stargate Wisconsin': [43.39, -87.88],  // Port Washington, WI
  'OpenAI Stargate Michigan': [42.17, -83.78],   // Saline, MI
  'OpenAI Stargate Milam': [30.75, -96.92],      // Milam County, TX
  'Meta Rosemount': [44.74, -93.13],      // Rosemount, MN
  'Google Kansas City East': [39.1, -94.58], // Kansas City, MO
  'QTS Cedar Rapids': [41.94, -91.67],    // Fairfax, IA
  'Alibaba Zhangbei': [41.15, 114.71],    // Zhangjiakou, Hebei, China
};
