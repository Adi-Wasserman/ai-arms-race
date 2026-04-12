import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { PCT_OWNED_TOOLTIP } from '@/config/labOwnershipMapping';
import { LAB_COLORS } from '@/config/labs';
import { PROJ_2029_TARGETS } from '@/data/projections';
import { useEpochChipOwners } from '@/hooks/useEpochChipOwners';
import { formatH100 } from '@/services/format';
import {
  computeOwnedH100e,
  computePctOwned,
  type OwnedH100eResult,
  type PctOwnedResult,
} from '@/services/ownershipMath';
import { useDashboard } from '@/store';
import {
  type ChipManufacturer,
  type EpochChipOwnersData,
  type Lab,
  OWNER_TO_LAB,
  type OwnerSnapshot,
} from '@/types';

import styles from './OwnershipTable.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

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
   visually distinct even though all clearly "green family":

     A100        olive-green   ~70°
     H100/H200   emerald       ~125°
     B200        jade          ~160°
     B300        teal-cyan     ~178°

   Saturation 50-60% and lightness 45-55% — bright enough to pop
   on the dashboard's dark navy background but not garish.
   Tonally consistent with the existing lab/chart palette.

   China-only Nvidia export variants (A800, H800, H20) take
   in-between green hues — they only co-occur with A100 in
   China's row, so they don't compete with the main 4.
   ───────────────────────────────────────────────────────────── */

const CHIP_COLORS: Record<string, string> = {
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
const MFR_COLORS: Record<ChipManufacturer | 'Unknown', string> = {
  Nvidia: '#3fa14d', // emerald (family center)
  Google: '#2c6ed1', // royal blue (family center)
  Amazon: '#d57e2a', // burnt orange (family center)
  AMD: '#b8453a', // brick red (family center)
  Huawei: '#8456b8', // medium purple (family center)
  Unknown: '#7a7a7a',
};

/** Resolve a per-segment color, falling back through chip-type → manufacturer → unknown. */
function chipColor(chipType: string, manufacturer: string): string {
  return (
    CHIP_COLORS[chipType] ??
    MFR_COLORS[manufacturer as ChipManufacturer] ??
    MFR_COLORS.Unknown
  );
}

const TOOLTIP_TEXT =
  'Ownership = who bought the chips. Access = who can use them (current view). Live from https://epoch.ai/data/ai_chip_owners.zip';

/* ─────────────────────────────────────────────────────────────
   Lab/operator badge taxonomy.

   3 categories surfaced as tiny pill badges next to the entity
   name in the OWNER / LAB column. The taxonomy describes the
   structural relationship between the operator (who bought the
   chips) and the frontier lab (who trains on them):

     Pure Owner    — operator IS the lab parent (Meta, xAI,
                     Google/Alphabet). Operator = consumer.
     Cloud Provider — pure hyperscaler hosting workloads for
                     others (Microsoft, Oracle, Amazon).
     Major Tenant  — frontier lab that runs entirely on rented
                     capacity from a Cloud Provider above
                     (OpenAI, Anthropic).

   Operators NOT in either set (Other, China) get no badge —
   they aren't structurally either thing in our editorial frame.

   Rows whose mapped lab is a Major Tenant also get a very
   subtle row tint via .rowMajorTenant so the structural
   relationship is visible at a glance.
   ───────────────────────────────────────────────────────────── */

type BadgeKind = 'pureOwner' | 'cloudProvider' | 'majorTenant';

const PURE_OWNER_OPERATORS = new Set<string>([
  'Meta',
  'xAI',
  'Google',
  'Alphabet',
]);
const CLOUD_PROVIDER_OPERATORS = new Set<string>([
  'Microsoft',
  'Oracle',
  'Amazon',
]);
const MAJOR_TENANT_LABS = new Set<Lab>(['OpenAI', 'Anthropic']);

/** Self-operated = operator IS the lab. Shared = lab rents from a hyperscaler. */
const SELF_OPERATED_OWNERS = new Set<string>(['Meta', 'xAI']);
const SHARED_HOST_OWNERS = new Set<string>(['Google', 'Alphabet', 'Microsoft', 'Amazon']);

function operatorIntegration(owner: string): 'self' | 'shared' | null {
  if (SELF_OPERATED_OWNERS.has(owner)) return 'self';
  if (SHARED_HOST_OWNERS.has(owner)) return 'shared';
  return null;
}

function operatorBadge(owner: string): BadgeKind | null {
  if (PURE_OWNER_OPERATORS.has(owner)) return 'pureOwner';
  if (CLOUD_PROVIDER_OPERATORS.has(owner)) return 'cloudProvider';
  return null;
}

function isMajorTenantLab(lab: Lab | null): boolean {
  return lab != null && MAJOR_TENANT_LABS.has(lab);
}

const BADGE_LABELS: Record<BadgeKind, string> = {
  pureOwner: 'Pure Owner',
  cloudProvider: 'Cloud Provider',
  majorTenant: 'Major Tenant',
};

const BADGE_TOOLTIPS: Record<BadgeKind, string> = {
  pureOwner:
    'Operator IS the lab — bought the chips and runs the workloads themselves.',
  cloudProvider:
    'Hyperscaler that hosts workloads for others. Owns the chips, rents the capacity.',
  majorTenant:
    'Frontier lab that runs entirely on rented capacity from a hyperscaler.',
};

function LabBadge({ kind }: { kind: BadgeKind }): JSX.Element {
  const cls =
    kind === 'pureOwner'
      ? styles.badgePureOwner
      : kind === 'cloudProvider'
        ? styles.badgeCloudProvider
        : styles.badgeMajorTenant;
  return (
    <span
      className={`${styles.badge} ${cls}`}
      title={BADGE_TOOLTIPS[kind]}
    >
      {BADGE_LABELS[kind]}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Per-row derived values
   ───────────────────────────────────────────────────────────── */

interface DerivedRow {
  rank: number;
  owner: string;
  mappedLab: Lab | null;
  h100e: number;
  h100eLow: number;
  h100eHigh: number;
  powerGw: number;
  pctGlobal: number;
  /**
   * Hybrid % Owned result: sum of Epoch chip-owner medians for the
   * lab's `selfOwned` entries ÷ lab's total effective fleet. Null
   * when the owner doesn't map to a tracked lab — Oracle/China/Other
   * have no "effective fleet" concept in our data model.
   */
  pctOwned: PctOwnedResult | null;
  /**
   * Raw lab-level owned H100e pulled directly from the live
   * Epoch ZIP via `selfOwned` in LAB_OWNERSHIP_CONFIG. Null on
   * unmapped operator rows (Oracle / China / Other) — those
   * aren't tracked labs.
   */
  ownedH100eEpoch: OwnedH100eResult | null;
  chipMix: ChipMixSegment[];
  proj2029: number | null;
  proj2029Growth: number | null;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  asOf: string;
}

interface ChipMixSegment {
  chipType: string;
  manufacturer: string;
  h100e: number;
  pct: number;
  color: string;
}

function rankClass(rank: number): string {
  if (rank === 1) return styles.rankGold;
  if (rank === 2) return styles.rankSilver;
  if (rank === 3) return styles.rankBronze;
  return styles.rankDefault;
}

/**
 * Confidence band derived from Epoch's Monte Carlo 5th/95th percentiles.
 *   spread = (h95 - h5) / median
 *   < 0.30  → HIGH    (tight Monte Carlo, well-sourced)
 *   < 0.60  → MEDIUM  (moderate uncertainty)
 *   < 1.20  → LOW     (wide band, sparse sourcing)
 *   else    → UNKNOWN (no median or absurd ratio)
 */
function deriveConfidence(
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

function deriveRows(
  snapshots: OwnerSnapshot[],
  fleetByLab: Partial<Record<Lab, number>>,
  chipOwners: EpochChipOwnersData | null,
): DerivedRow[] {
  const totalH100e = snapshots.reduce((s, x) => s + x.h100e, 0) || 1;

  return snapshots.map((s, i) => {
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

    // % Owned: hybrid ratio — sum of Epoch chip-owner medians for the
    // lab's `selfOwned` entries ÷ lab's total effective fleet. Only
    // computable for tracked labs (unmapped owners have no fleet).
    const pctOwned =
      mappedLab && fleetByLab[mappedLab] !== undefined
        ? computePctOwned(mappedLab, fleetByLab[mappedLab] ?? 0, chipOwners)
        : null;

    // Raw lab-level owned median (no denominator, no overrides) —
    // direct sum of selfOwned snapshots from the live ZIP. Only
    // meaningful for rows that map to a tracked lab.
    const ownedH100eEpoch = mappedLab
      ? computeOwnedH100e(mappedLab, chipOwners)
      : null;

    return {
      rank: i + 1,
      owner: s.owner,
      mappedLab,
      h100e: s.h100e,
      h100eLow: s.h100eLow,
      h100eHigh: s.h100eHigh,
      powerGw: s.powerMw / 1000,
      pctGlobal: (s.h100e / totalH100e) * 100,
      pctOwned,
      ownedH100eEpoch,
      chipMix: buildChipMix(s),
      proj2029,
      proj2029Growth,
      confidence: deriveConfidence(s.h100e, s.h100eLow, s.h100eHigh),
      asOf: s.asOf,
    };
  });
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────── */

function ConfidenceBadge({
  conf,
}: {
  conf: DerivedRow['confidence'];
}): JSX.Element {
  const cls =
    conf === 'high'
      ? styles.confHigh
      : conf === 'medium'
        ? styles.confMed
        : conf === 'low'
          ? styles.confLow
          : styles.confUnknown;
  const label =
    conf === 'high'
      ? 'HIGH'
      : conf === 'medium'
        ? 'MED'
        : conf === 'low'
          ? 'LOW'
          : '—';
  return (
    <span
      className={`${styles.confBadge} ${cls}`}
      title="Confidence derived from Epoch's Monte Carlo 5th/95th percentile spread"
    >
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hover popover state.

   We use a single module-level state for the currently hovered
   segment + its anchor coordinates. Rendering happens via a
   React Portal so the popover escapes the table's `overflow-x:
   auto` clipping (which was why the native HTML `title`
   attribute was unreliable here).
   ───────────────────────────────────────────────────────────── */

interface HoveredSegment {
  chipType: string;
  manufacturer: string;
  h100e: number;
  pct: number;
  color: string;
  /** Center-x of the anchor segment in viewport coordinates. */
  anchorX: number;
  /** Top-y of the anchor segment in viewport coordinates. */
  anchorY: number;
  /** Owner name (for the popover header). */
  owner: string;
}

function ChipMixTooltip({
  segment,
}: {
  segment: HoveredSegment;
}): JSX.Element {
  return createPortal(
    <div
      className={styles.tooltip}
      style={{
        left: segment.anchorX,
        top: segment.anchorY,
      }}
    >
      <div className={styles.tooltipHeader}>
        <span
          className={styles.tooltipDot}
          style={{ background: segment.color }}
        />
        <span className={styles.tooltipChip}>{segment.chipType}</span>
      </div>
      <div className={styles.tooltipMeta}>
        <span className={styles.tooltipMetaLabel}>{segment.owner}</span>
        {' · '}
        <span>{segment.manufacturer}</span>
      </div>
      <div className={styles.tooltipBody}>
        <div>
          <span className={styles.tooltipBodyLabel}>H100e</span>
          <span className={styles.tooltipBodyValue}>
            {formatH100(segment.h100e)}
          </span>
        </div>
        <div>
          <span className={styles.tooltipBodyLabel}>Share</span>
          <span className={styles.tooltipBodyValue}>
            {segment.pct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────────────────────────────────────────────
   "Owned H100e (Epoch)" column — hover tooltip.

   Mirrors the ChipMixTooltip portal pattern so it escapes the
   table's `overflow-x: auto` clipping. `pointer-events: none`
   (same as chip-mix) — the methodology link is inside the cell
   itself (anchor tag), not inside the tooltip, so there's no
   need to make the tooltip clickable.
   ───────────────────────────────────────────────────────────── */

interface HoveredOwned {
  ownerName: string;
  labName: Lab;
  median: number;
  low: number;
  high: number;
  anchorX: number;
  anchorY: number;
}

function OwnedMedianTooltip({
  segment,
}: {
  segment: HoveredOwned;
}): JSX.Element {
  return createPortal(
    <div
      className={styles.tooltip}
      style={{
        left: segment.anchorX,
        top: segment.anchorY,
      }}
    >
      <div className={styles.tooltipHeader}>
        <span
          className={styles.tooltipDot}
          style={{ background: LAB_COLORS[segment.labName] }}
        />
        <span className={styles.tooltipChip}>{segment.labName}</span>
      </div>
      <div className={styles.tooltipBody} style={{ gridTemplateColumns: '1fr' }}>
        <div>
          <span className={styles.tooltipBodyLabel}>Epoch median</span>
          <span className={styles.tooltipBodyValue}>
            {formatH100(segment.median)} H100e
          </span>
        </div>
        <div>
          <span className={styles.tooltipBodyLabel}>
            5th–95th percentile (Monte Carlo)
          </span>
          <span className={styles.tooltipBodyValue}>
            {formatH100(segment.low)} – {formatH100(segment.high)}
          </span>
        </div>
      </div>
      <div className={styles.tooltipMeta} style={{ marginTop: 8 }}>
        Click cell → <span className={styles.tooltipMetaLabel}>Full methodology</span>
      </div>
    </div>,
    document.body,
  );
}

function ChipMixCell({
  row,
  ownerName,
  scalePct,
  hovered,
  setHovered,
}: {
  row: DerivedRow;
  ownerName: string;
  /** Bar width as a percentage of the cell (0–100), relative to the largest owner. */
  scalePct: number;
  hovered: HoveredSegment | null;
  setHovered: (s: HoveredSegment | null) => void;
}): JSX.Element {
  if (row.chipMix.length === 0) {
    return <span style={{ color: 'var(--color-text-quaternary)' }}>—</span>;
  }
  // Sort segments by share descending so the legend matches the
  // visual prominence of the bar (biggest slice first).
  const sorted = [...row.chipMix].sort((a, b) => b.pct - a.pct);

  // Manufacturer rollup — sums per-chip percentages by manufacturer.
  // Always-visible at the top of the cell so the user has a quick
  // "Nvidia X% · Google Y%" summary without reading the chip-type list.
  const byMfr = new Map<string, number>();
  for (const seg of sorted) {
    byMfr.set(seg.manufacturer, (byMfr.get(seg.manufacturer) ?? 0) + seg.pct);
  }
  const mfrEntries = Array.from(byMfr.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className={styles.chipMix}>
      {/* ─── Stacked bar — one segment per chip type ─── */}
      <div className={styles.chipMixBar} style={{ width: `${scalePct}%` }}>
        {sorted.map((seg, i) => {
          const isHovered =
            hovered != null &&
            hovered.owner === ownerName &&
            hovered.chipType === seg.chipType;
          return (
            <div
              key={`${seg.chipType}-${i}`}
              className={`${styles.chipMixSegment}${isHovered ? ` ${styles.chipMixSegmentActive}` : ''}`}
              style={{ width: `${seg.pct}%`, background: seg.color }}
              aria-label={`${seg.chipType}: ${seg.pct.toFixed(1)}%`}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHovered({
                  chipType: seg.chipType,
                  manufacturer: seg.manufacturer,
                  h100e: seg.h100e,
                  pct: seg.pct,
                  color: seg.color,
                  anchorX: rect.left + rect.width / 2,
                  anchorY: rect.top,
                  owner: ownerName,
                });
              }}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>

      {/* ─── Manufacturer rollup (always visible) ─── */}
      <div className={styles.chipMixMfrRollup}>
        {mfrEntries.map(([mfr, pct], i) => (
          <span key={mfr}>
            {i > 0 && <span className={styles.chipMixMfrSep}> · </span>}
            <span
              className={styles.chipMixMfrName}
              style={{
                color:
                  MFR_COLORS[mfr as ChipManufacturer] ?? MFR_COLORS.Unknown,
              }}
            >
              {mfr}
            </span>{' '}
            <span className={styles.chipMixMfrPct}>{pct.toFixed(0)}%</span>
          </span>
        ))}
      </div>

      {/* ─── Per-chip-type legend — full breakdown, no hover required ─── */}
      <div className={styles.chipMixLegend}>
        {sorted.map((seg) => (
          <span key={seg.chipType} className={styles.chipMixLegendItem}>
            <span
              className={styles.chipMixLegendDot}
              style={{ background: seg.color }}
            />
            <span className={styles.chipMixLegendType}>{seg.chipType}</span>
            <span className={styles.chipMixLegendPct}>
              {seg.pct < 1 ? '<1%' : `${seg.pct.toFixed(0)}%`}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────── */

export function OwnershipTable(): JSX.Element {
  const { data, loading, error, lastUpdated, fromCache } =
    useEpochChipOwners();

  // Pull the full fleet series so deriveRows has a per-lab denominator
  // for % Owned. dataVersion drives memo invalidation when fresh
  // Epoch data lands.
  const seriesFull = useDashboard((s) => s.seriesFull);
  const dataVersion = useDashboard((s) => s.dataVersion);
  // Owner name set by OwnershipSidePanel cards — tells us which row to
  // scroll into view + highlight when the user jumps in from the panel.
  const highlightedOwner = useDashboard((s) => s.highlightedOwner);
  const setHighlightedOwner = useDashboard((s) => s.setHighlightedOwner);

  const rows = useMemo<DerivedRow[]>(() => {
    if (!data) return [];
    const past = seriesFull.filter((x) => x.date <= TODAY_ISO);
    const fullPt = past.length > 0 ? past[past.length - 1] : null;
    const fleetByLab: Partial<Record<Lab, number>> = {};
    if (fullPt) {
      (['OpenAI', 'Anthropic', 'Gemini', 'Meta', 'xAI'] as Lab[]).forEach(
        (lab) => {
          fleetByLab[lab] = fullPt[lab];
        },
      );
    }
    // ── Reorder snapshots so frontier-anchored owners come first ──
    // The OwnershipSidePanel sorts the 5 frontier operators by H100e
    // descending; we mirror that order here so the panel and table
    // read as a coherent pair. Non-frontier owners (Other, Oracle,
    // China) follow, also sorted by H100e desc.
    const isFrontier = (ownerName: string): boolean =>
      OWNER_TO_LAB[ownerName as keyof typeof OWNER_TO_LAB] != null;
    const frontier = data.latestByOwner
      .filter((s) => isFrontier(s.owner))
      .sort((a, b) => b.h100e - a.h100e);
    const nonFrontier = data.latestByOwner
      .filter((s) => !isFrontier(s.owner))
      .sort((a, b) => b.h100e - a.h100e);
    const ordered = [...frontier, ...nonFrontier];
    return deriveRows(ordered, fleetByLab, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dataVersion]);

  const maxH100e = useMemo(
    () => rows.reduce((max, r) => Math.max(max, r.h100e), 1),
    [rows],
  );

  /**
   * Currently-hovered chip-mix segment. Tracks the segment + its
   * viewport coordinates so the popover can be portaled to the page
   * body and escape the table's `overflow-x: auto` clipping.
   */
  const [hovered, setHovered] = useState<HoveredSegment | null>(null);

  /** Hovered "Owned H100e (Epoch)" cell — separate from chip-mix hover. */
  const [hoveredOwned, setHoveredOwned] = useState<HoveredOwned | null>(null);

  /**
   * Per-owner row refs — the highlight effect uses these to call
   * `scrollIntoView` on the right row when the user clicks a card
   * in the OwnershipSidePanel.
   */
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  /**
   * When `highlightedOwner` changes, scroll the matching row into
   * view, then clear the store value after a short delay so the
   * highlight class drops off and re-clicking re-fires the effect.
   */
  useEffect(() => {
    if (!highlightedOwner) return;
    const row = rowRefs.current.get(highlightedOwner);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const t = window.setTimeout(() => {
      setHighlightedOwner(null);
    }, 1800);
    return () => window.clearTimeout(t);
  }, [highlightedOwner, setHighlightedOwner]);

  // Clear the popover when the user scrolls or resizes — segment
  // coordinates would otherwise be stale.
  useEffect(() => {
    if (!hovered) return;
    const dismiss = (): void => setHovered(null);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [hovered]);

  // Same dismiss-on-scroll/resize behavior for the owned-median tooltip.
  useEffect(() => {
    if (!hoveredOwned) return;
    const dismiss = (): void => setHoveredOwned(null);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [hoveredOwned]);

  // ── Empty / loading / error states ──
  if (!data && loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.skeleton}>Loading Epoch chip owners…</div>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.errorMsg}>
          Failed to load chip ownership data: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.skeleton}>No ownership data available.</div>
      </div>
    );
  }

  // ── Banner state ──
  const bannerStatus =
    error && fromCache ? 'error' : fromCache ? 'stale' : 'ok';
  const bannerCls =
    bannerStatus === 'error'
      ? styles.error
      : bannerStatus === 'stale'
        ? styles.stale
        : '';
  const dotCls =
    bannerStatus === 'error'
      ? styles.error
      : bannerStatus === 'stale'
        ? styles.stale
        : '';
  const bannerLabel =
    bannerStatus === 'error'
      ? 'STALE / OFFLINE'
      : bannerStatus === 'stale'
        ? 'CACHED'
        : 'LIVE';

  return (
    <div className={styles.wrapper}>
      {/* ─── Metadata banner ─── */}
      <div className={`${styles.metaBar} ${bannerCls}`} title={TOOLTIP_TEXT}>
        <span className={`${styles.metaDot} ${dotCls}`} />
        <span>
          <span className={styles.metaLabel}>Hardware Ownership · </span>
          <span className={styles.metaValue}>{bannerLabel}</span>
        </span>
        <span>
          <span className={styles.metaLabel}>as of </span>
          <span className={styles.metaValue}>{data.asOf}</span>
        </span>
        <span>
          <span className={styles.metaLabel}>updated </span>
          <span className={styles.metaValue}>
            {lastUpdated
              ? new Date(lastUpdated).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </span>
        </span>
        <span>
          <span className={styles.metaLabel}>source </span>
          <a
            className={styles.metaLink}
            href="https://epoch.ai/data/ai_chip_owners.zip"
            target="_blank"
            rel="noreferrer"
            title={TOOLTIP_TEXT}
          >
            ai_chip_owners.zip
          </a>
        </span>
        {loading && (
          <span className={styles.metaUpdating}>UPDATING…</span>
        )}
      </div>

      {/* ─── Editorial lede ─── */}
      <div className={styles.lede}>
        <p className={styles.ledeText}>
          5 hyperscalers buy the chips — but only{' '}
          <strong>2 of 5 frontier labs</strong> actually operate them.
          The other 3 are tenants on shared infrastructure.
        </p>
        <div className={styles.ledePills}>
          <span className={`${styles.ledePill} ${styles.ledePillSelf}`}>
            SELF-OPERATED
          </span>
          <span className={styles.ledePillDesc}>
            Operator is the lab (Meta, xAI)
          </span>
          <span className={`${styles.ledePill} ${styles.ledePillShared}`}>
            SHARED HOST
          </span>
          <span className={styles.ledePillDesc}>
            Lab rents capacity (OpenAI, Gemini, Anthropic)
          </span>
        </div>
      </div>

      {/* ─── Table ─── */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} style={{ width: '14%' }}>OWNER / LAB</th>
            <th className={`${styles.th} ${styles.right}`} style={{ width: '8%' }}>H100e MEDIAN</th>
            <th className={`${styles.th} ${styles.right}`} style={{ width: '8%' }}>POWER</th>
            <th className={`${styles.th} ${styles.right}`} style={{ width: '8%' }}>% OF GLOBAL</th>
            <th className={`${styles.th} ${styles.chipMixTh}`} style={{ width: '26%' }}>CHIP MIX</th>
            <th className={`${styles.th} ${styles.right}`} style={{ width: '13%' }}>2029 TARGET</th>
            <th className={`${styles.th} ${styles.right}`} style={{ width: '7%' }}>CONF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const labColor = row.mappedLab ? LAB_COLORS[row.mappedLab] : '#888';
            const isHighlighted = highlightedOwner === row.owner;
            // Badge taxonomy. The operator badge sits next to the
            // top-line owner name; the major-tenant badge (if any)
            // sits next to the "→ Lab" sub-label below it. Rows
            // whose lab is a Major Tenant get a subtle gray tint
            // via .rowMajorTenant.
            const opBadge = operatorBadge(row.owner);
            const tenantRow = isMajorTenantLab(row.mappedLab);
            const integration = operatorIntegration(row.owner);
            return (
              <tr
                key={row.owner}
                ref={(el) => {
                  if (el) rowRefs.current.set(row.owner, el);
                  else rowRefs.current.delete(row.owner);
                }}
                className={`${styles.row}${isHighlighted ? ` ${styles.rowHighlight}` : ''}${tenantRow ? ` ${styles.rowMajorTenant}` : ''}`}
                style={{ '--row-color': labColor } as React.CSSProperties}
              >
                <td className={styles.td}>
                  <div className={styles.ownerName} style={{ color: labColor }}>
                    {row.owner}
                    {row.mappedLab && (
                      <span className={styles.ownerLab}>
                        → {row.mappedLab}
                      </span>
                    )}
                    {!row.mappedLab && (
                      <span className={styles.ownerSub}>(no lab attribution)</span>
                    )}
                  </div>
                  {integration && (
                    <span
                      className={`${styles.integrationPill} ${integration === 'self' ? styles.integrationSelf : styles.integrationShared}`}
                    >
                      {integration === 'self' ? 'SELF-OPERATED' : 'SHARED HOST'}
                    </span>
                  )}
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  <div className={styles.h100eMain} style={{ color: labColor }}>{formatH100(row.h100e)}</div>
                </td>
                <td className={`${styles.td} ${styles.right} ${styles.power}`} style={{ color: labColor }}>
                  {row.powerGw.toFixed(2)} GW
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  <div className={styles.pctGlobalCell}>
                    <span className={styles.pctGlobalValue}>
                      {row.pctGlobal.toFixed(1)}%
                    </span>
                    <div className={styles.pctGlobalBarTrack}>
                      <div
                        className={styles.pctGlobalBarFill}
                        style={{
                          width: `${row.pctGlobal}%`,
                          background: row.mappedLab ? labColor : '#666',
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className={`${styles.td} ${styles.chipMixTd}`}>
                  <ChipMixCell
                    row={row}
                    ownerName={row.owner}
                    scalePct={Math.max(8, (row.h100e / maxH100e) * 100)}
                    hovered={hovered}
                    setHovered={setHovered}
                  />
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  {row.proj2029 != null ? (
                    <>
                      <div className={styles.proj}>{formatH100(row.proj2029)}</div>
                      {row.proj2029Growth != null && (
                        <div className={styles.projGrowth}>
                          ~{Math.round(row.proj2029Growth)}× by Jan 2029
                        </div>
                      )}
                    </>
                  ) : (
                    <span className={styles.projMuted}>—</span>
                  )}
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  <ConfidenceBadge conf={row.confidence} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ─── Footer ───
          Trimmed from a 4-paragraph wall of fine print to two
          readable lines + one pointer to the Truth modal. The
          methodology footnote, override caveat, and technical
          caveats (confidence bands, projection logic, owner→lab
          attribution) all live in About this data → Truth modal,
          so repeating them inline was just clutter. */}
      <div className={styles.footer}>
        <p className={styles.footerLead}>
          † <strong>Owned H100e</strong> numbers are raw medians directly from
          the Epoch AI Chip Owners ZIP (live). <strong>% Owned</strong> for
          OpenAI and Anthropic uses the documented override because Epoch
          attributes those chips to the hyperscalers, not the labs — every
          other value is 100% data-derived.
        </p>
        <p className={styles.footerNote}>{TOOLTIP_TEXT}</p>
        <p className={styles.footerPointer}>
          Full methodology, override surface area, and uncertainty bands →
          click <strong>ⓘ ABOUT THIS DATA</strong> in the top status bar.
        </p>
      </div>

      {/* Hover popovers — portaled to document.body so they escape
          the table's overflow-x clipping. */}
      {hovered && <ChipMixTooltip segment={hovered} />}
      {hoveredOwned && <OwnedMedianTooltip segment={hoveredOwned} />}
    </div>
  );
}
