import { PROJ_2029_TARGETS } from '@/data/projections';
import {
  type ChipManufacturer,
  type EpochChipOwnersData,
  type Lab,
  OWNER_TO_LAB,
  type OwnerSnapshot,
} from '@/types';

/* ─────────────────────────────────────────────────────────────
   Chip-mix color palette.

   Design rationale: bounded hue ranges per manufacturer family
   so the family is visually obvious AT A GLANCE, but individual
   chips within a family are still distinguishable because they
   span ~80° of the family hue range (not just different shades
   of one hue).

   - Nvidia       → greens (hue 60°-180°, yellow-green → teal)
   - Google TPU   → blues  (hue 200°-260°, cyan → indigo)
   - AWS Trainium → ambers (hue 25°-45°)
   - AMD          → reds   (hue 0°-15°)
   - Huawei       → purples (hue 270°-290°)

   Within Nvidia, the 4 high-frequency hyperscaler chips (A100,
   H100/H200, B200, B300) are spaced ~35° apart so they're
   visually distinct even though all clearly "green family".
   Saturation 50-60% and lightness 45-55% — bright enough to pop
   on the dashboard's dark navy background but not garish.

   China-only Nvidia export variants (A800, H800, H20) take
   in-between green hues — they only co-occur with A100 in
   China's row, so they don't compete with the main 4.
   ───────────────────────────────────────────────────────────── */

export const CHIP_COLORS: Record<string, string> = {
  // ── Nvidia (greens, hue 60°-180°) ────────────────────────────
  // 4 hyperscaler chips — spaced for max contrast within family
  A100: '#a8b738', //   ~65°  olive-yellow
  'H100/H200': '#3fa14d', // ~125° emerald (Nvidia-ish brand green)
  B200: '#1fb586', //   ~160° jade
  B300: '#13b3a6', //   ~177° teal-cyan
  // China-only export variants (only co-occur with A100, fill gaps)
  A800: '#c5c233', //   ~58°  yellow-olive
  H800: '#6db347', //   ~102° medium leaf green
  H20: '#2e9d76', //    ~162° forest green

  // ── Google TPU (blues, hue 200°-260°) ────────────────────────
  // 6 chips, all in Google's row, spaced across the blue range
  'TPU v4': '#2c6ed1', //  ~214° royal blue
  'TPU v4i': '#1d4dab', // ~218° dark navy
  'TPU v5e': '#4d8eea', // ~214° medium sky
  'TPU v5p': '#7badf0', // ~213° light sky
  'TPU v6e': '#5b54d4', // ~243° indigo
  'TPU v7': '#3eb6dd', //  ~195° cyan

  // ── AWS Trainium (ambers, hue 25°-45°) ───────────────────────
  Trainium1: '#d57e2a', // ~30° burnt orange
  Trainium2: '#eba33f', // ~33° amber

  // ── AMD Instinct (reds, hue 0°-15°) ──────────────────────────
  'Instinct MI250X': '#b8453a',
  'Instinct MI300A': '#cc524a',
  'Instinct MI300X': '#a83a32',
  'Instinct MI308X': '#d96058',
  'Instinct MI325X': '#933027',
  'Instinct MI350X': '#bd433c',
  'Instinct MI355X': '#e36e66',

  // ── Huawei Ascend (purples, hue 270°-290°) ───────────────────
  'Ascend 910B': '#8456b8',
  'Ascend 910C': '#9d6cc9',
};

/**
 * Manufacturer color used as a fallback when a future Epoch release
 * adds an unknown chip type. Each is the central hue of its family,
 * so an unknown Nvidia chip still renders as "some green" and stays
 * grouped visually.
 */
export const MFR_COLORS: Record<ChipManufacturer | 'Unknown', string> = {
  Nvidia: '#3fa14d', // emerald (family center)
  Google: '#2c6ed1', // royal blue (family center)
  Amazon: '#d57e2a', // burnt orange (family center)
  AMD: '#b8453a', // brick red (family center)
  Huawei: '#8456b8', // medium purple (family center)
  Unknown: '#7a7a7a',
};

/** Resolve a per-segment color, falling back through chip-type → manufacturer → unknown. */
export function chipColor(chipType: string, manufacturer: string): string {
  return (
    CHIP_COLORS[chipType] ??
    MFR_COLORS[manufacturer as ChipManufacturer] ??
    MFR_COLORS.Unknown
  );
}

/* ─────────────────────────────────────────────────────────────
   Operator taxonomy.

   Self-operated = operator IS the lab (Meta, xAI, Google).
   Shared host   = hyperscaler renting capacity to a lab
                   (Microsoft → OpenAI, Amazon → Anthropic).
   Rows whose mapped lab runs entirely on rented capacity get a
   subtle row tint (.rowMajorTenant) so the structural
   relationship is visible at a glance.
   ───────────────────────────────────────────────────────────── */

const SELF_OPERATED_OWNERS = new Set<string>(['Meta', 'xAI', 'Google', 'Alphabet']);
const SHARED_HOST_OWNERS = new Set<string>(['Microsoft', 'Amazon']);
const MAJOR_TENANT_LABS = new Set<Lab>(['OpenAI', 'Anthropic']);

export function operatorIntegration(owner: string): 'self' | 'shared' | null {
  if (SELF_OPERATED_OWNERS.has(owner)) return 'self';
  if (SHARED_HOST_OWNERS.has(owner)) return 'shared';
  return null;
}

export function isMajorTenantLab(lab: Lab | null): boolean {
  return lab != null && MAJOR_TENANT_LABS.has(lab);
}

/* ─────────────────────────────────────────────────────────────
   Per-row derived values
   ───────────────────────────────────────────────────────────── */

export interface ChipMixSegment {
  chipType: string;
  manufacturer: string;
  h100e: number;
  pct: number;
  color: string;
}

export interface DerivedRow {
  owner: string;
  mappedLab: Lab | null;
  h100e: number;
  powerGw: number;
  pctGlobal: number;
  chipMix: ChipMixSegment[];
  proj2029: number | null;
  proj2029Growth: number | null;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
}

/**
 * Confidence band derived from Epoch's Monte Carlo 5th/95th percentiles.
 *   spread = (h95 - h5) / median
 *   < 0.30  → HIGH    (tight Monte Carlo, well-sourced)
 *   < 0.60  → MEDIUM  (moderate uncertainty)
 *   < 1.20  → LOW     (wide band, sparse sourcing)
 *   else    → UNKNOWN (no median or absurd ratio)
 */
export function deriveConfidence(
  median: number,
  low: number,
  high: number,
): DerivedRow['confidence'] {
  if (median <= 0) return 'unknown';
  const spread = (high - low) / median;
  if (!Number.isFinite(spread) || spread < 0) return 'unknown';
  if (spread < 0.3) return 'high';
  if (spread < 0.6) return 'medium';
  if (spread < 1.2) return 'low';
  return 'unknown';
}

function buildChipMix(snapshot: OwnerSnapshot): ChipMixSegment[] {
  const total = snapshot.h100e || 1;
  return snapshot.byChipType
    .filter((c) => c.h100e > 0)
    .map((c) => ({
      chipType: c.chipType,
      manufacturer: c.manufacturer,
      h100e: c.h100e,
      pct: (c.h100e / total) * 100,
      // Per-chip-type color so multi-Nvidia rows show the breakdown
      // visually, not as one undifferentiated green block.
      color: chipColor(c.chipType, c.manufacturer),
    }));
}

/**
 * Build the table rows: frontier-anchored owners first (sorted by
 * H100e desc), then non-frontier owners (Other, Oracle, China).
 */
export function deriveOwnershipRows(data: EpochChipOwnersData): DerivedRow[] {
  const isFrontier = (ownerName: string): boolean =>
    OWNER_TO_LAB[ownerName as keyof typeof OWNER_TO_LAB] != null;
  const frontier = data.latestByOwner
    .filter((s) => isFrontier(s.owner))
    .sort((a, b) => b.h100e - a.h100e);
  const nonFrontier = data.latestByOwner
    .filter((s) => !isFrontier(s.owner))
    .sort((a, b) => b.h100e - a.h100e);
  const ordered = [...frontier, ...nonFrontier];

  const totalH100e = ordered.reduce((s, x) => s + x.h100e, 0) || 1;

  return ordered.map((s) => {
    const mappedLab = (OWNER_TO_LAB[s.owner as keyof typeof OWNER_TO_LAB] ??
      null) as Lab | null;

    // 2029 projection: only meaningful for owners that map cleanly to a
    // tracked lab (we have explicit per-lab targets in PROJ_2029_TARGETS).
    let proj2029: number | null = null;
    let proj2029Growth: number | null = null;
    if (mappedLab) {
      const target = PROJ_2029_TARGETS[mappedLab];
      if (target) {
        proj2029 = target.h;
        proj2029Growth = s.h100e > 0 ? target.h / s.h100e : null;
      }
    }

    return {
      owner: s.owner,
      mappedLab,
      h100e: s.h100e,
      powerGw: s.powerMw / 1000,
      pctGlobal: (s.h100e / totalH100e) * 100,
      chipMix: buildChipMix(s),
      proj2029,
      proj2029Growth,
      confidence: deriveConfidence(s.h100e, s.h100eLow, s.h100eHigh),
    };
  });
}
