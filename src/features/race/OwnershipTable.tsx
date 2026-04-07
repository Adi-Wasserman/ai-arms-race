import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  PCT_OWNED_FOOTNOTE,
  PCT_OWNED_TOOLTIP,
} from '@/config/labOwnershipMapping';
import { LAB_COLORS } from '@/config/labs';
import { PROJ_2029_TARGETS } from '@/data/projections';
import { useEpochChipOwners } from '@/hooks/useEpochChipOwners';
import { formatH100 } from '@/services/format';
import {
  computePctOwned,
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

function ChipMixCell({
  row,
  ownerName,
  hovered,
  setHovered,
}: {
  row: DerivedRow;
  ownerName: string;
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
      <div className={styles.chipMixBar}>
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
  const { data, loading, error, lastUpdated, fromCache, refresh } =
    useEpochChipOwners();

  // Pull the full fleet series so deriveRows has a per-lab denominator
  // for % Owned. dataVersion drives memo invalidation when fresh
  // Epoch data lands.
  const seriesFull = useDashboard((s) => s.seriesFull);
  const dataVersion = useDashboard((s) => s.dataVersion);

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
    return deriveRows(data.latestByOwner, fleetByLab, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dataVersion]);

  /**
   * Currently-hovered chip-mix segment. Tracks the segment + its
   * viewport coordinates so the popover can be portaled to the page
   * body and escape the table's `overflow-x: auto` clipping.
   */
  const [hovered, setHovered] = useState<HoveredSegment | null>(null);

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
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => void refresh()}
          disabled={loading}
          title="Force-refresh from Epoch (bypasses 24h cache)"
        >
          {loading ? '…' : '↻ REFRESH'}
        </button>
      </div>

      {/* ─── Table ─── */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>#</th>
            <th className={styles.th}>OWNER / LAB</th>
            <th className={`${styles.th} ${styles.right}`}>
              OWNED H100e (median ± 5–95)
            </th>
            <th className={`${styles.th} ${styles.right}`}>OWNED POWER</th>
            <th className={`${styles.th} ${styles.right}`}>% OF GLOBAL</th>
            <th
              className={`${styles.th} ${styles.right}`}
              title={PCT_OWNED_TOOLTIP}
            >
              % OWNED ⓘ
            </th>
            <th className={styles.th}>CHIP MIX</th>
            <th className={`${styles.th} ${styles.right}`}>2029 PROJECTION</th>
            <th className={`${styles.th} ${styles.right}`}>CONF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const labColor = row.mappedLab ? LAB_COLORS[row.mappedLab] : '#888';
            return (
              <tr key={row.owner} className={styles.row}>
                <td className={styles.td}>
                  <div className={`${styles.rank} ${rankClass(row.rank)}`}>
                    {row.rank}
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.ownerName}>{row.owner}</div>
                  {row.mappedLab && (
                    <div className={styles.ownerLab} style={{ color: labColor }}>
                      → {row.mappedLab}
                    </div>
                  )}
                  {!row.mappedLab && (
                    <div className={styles.ownerSub}>(no lab attribution)</div>
                  )}
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  <div className={styles.h100eMain}>{formatH100(row.h100e)}</div>
                  <div className={styles.h100eRange}>
                    {formatH100(row.h100eLow)} – {formatH100(row.h100eHigh)}
                  </div>
                </td>
                <td className={`${styles.td} ${styles.right} ${styles.power}`}>
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
                <td
                  className={`${styles.td} ${styles.right}`}
                  title={
                    row.pctOwned != null
                      ? (row.pctOwned.footnote ?? PCT_OWNED_TOOLTIP)
                      : 'Unmapped owner — no effective-fleet data to compare against'
                  }
                >
                  {row.pctOwned != null ? (
                    <div className={styles.pctOwnedCell}>
                      <span className={styles.pctOwnedValue}>
                        {row.pctOwned.pct}%
                        {!row.pctOwned.isDerivedFromEpoch && (
                          <span
                            style={{
                              marginLeft: 4,
                              fontSize: 9,
                              color: 'var(--color-text-tertiary)',
                              fontWeight: 400,
                            }}
                          >
                            *
                          </span>
                        )}
                      </span>
                      <div className={styles.pctOwnedBarTrack}>
                        <div
                          className={styles.pctOwnedBarFill}
                          style={{
                            width: `${row.pctOwned.pct}%`,
                            background: row.mappedLab ? labColor : '#666',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className={styles.projMuted}>—</span>
                  )}
                </td>
                <td className={styles.td}>
                  <ChipMixCell
                    row={row}
                    ownerName={row.owner}
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

      {/* ─── Footnote ─── */}
      <div
        style={{
          padding: '10px 16px',
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-text-tertiary)',
          lineHeight: 1.55,
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(255, 255, 255, 0.01)',
        }}
      >
        <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{TOOLTIP_TEXT}</strong>
        <br />
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>
          * {PCT_OWNED_FOOTNOTE}
        </span>
        <br />
        Confidence bands derived from Epoch's Monte Carlo 5th/95th percentile spread.
        2029 projection uses our power-constrained per-lab targets where the owner
        maps cleanly to a tracked frontier lab; unmapped owners (Oracle, China, Other)
        show no projection. Power is total chip-level TDP (not facility power).
        Owner→Lab attribution is approximate — Epoch's "Microsoft" includes Bing/Office
        workloads and "Amazon" includes general AWS, not just OpenAI / Anthropic.
      </div>

      {/* Hover popover — portaled to document.body so it escapes the
          table's overflow-x clipping. */}
      {hovered && <ChipMixTooltip segment={hovered} />}
    </div>
  );
}
