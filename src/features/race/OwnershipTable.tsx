import { useMemo } from 'react';

import { LAB_COLORS } from '@/config/labs';
import { PROJ_2029_TARGETS } from '@/data/projections';
import { useEpochChipOwners } from '@/hooks/useEpochChipOwners';
import { formatH100, formatPower } from '@/services/format';
import {
  type ChipManufacturer,
  type Lab,
  OWNER_TO_LAB,
  type OwnerSnapshot,
} from '@/types';

import styles from './OwnershipTable.module.css';

/* ─────────────────────────────────────────────────────────────
   Chip-mix color palette.

   Each chip TYPE gets a distinct color so the stacked bar
   actually shows the breakdown — earlier we colored by
   manufacturer, which made every Microsoft / Meta / Amazon
   row look like one undifferentiated green block (since they
   all use multiple Nvidia chip types).

   Within a manufacturer family the colors are tonally grouped
   (greens for Nvidia, blues for Google TPU, oranges for AWS
   Trainium, reds for AMD, purples for Huawei) and ordered by
   chip generation — older/dimmer → newer/brighter.
   ───────────────────────────────────────────────────────────── */

const CHIP_COLORS: Record<string, string> = {
  // ── Nvidia (greens) ───────────────────────────────
  A100: '#3a6b00',
  A800: '#5c9e00',
  'H100/H200': '#76b900',
  H800: '#8fcc1f',
  H20: '#a8db44',
  B200: '#bce665',
  B300: '#d2f085',

  // ── Google TPU (blues) ────────────────────────────
  'TPU v4': '#1a3a8a',
  'TPU v4i': '#2a4f9f',
  'TPU v5e': '#3b66b8',
  'TPU v5p': '#4285f4',
  'TPU v6e': '#6ba0f7',
  'TPU v7': '#9bc1fa',

  // ── AWS Trainium (oranges) ────────────────────────
  Trainium1: '#cc7700',
  Trainium2: '#ff9900',

  // ── AMD Instinct (reds) ───────────────────────────
  'Instinct MI250X': '#7a0c10',
  'Instinct MI300A': '#9b1015',
  'Instinct MI300X': '#bc141a',
  'Instinct MI308X': '#dd181f',
  'Instinct MI325X': '#ed1c24',
  'Instinct MI350X': '#f43d44',
  'Instinct MI355X': '#fa6066',

  // ── Huawei Ascend (purples) ───────────────────────
  'Ascend 910B': '#7a1c5e',
  'Ascend 910C': '#a32477',
};

/**
 * Manufacturer color used by the compact legend below each bar.
 * The bar segments themselves use `CHIP_COLORS[chipType]`.
 */
const MFR_COLORS: Record<ChipManufacturer | 'Unknown', string> = {
  Nvidia: '#76b900',
  Google: '#4285f4',
  Amazon: '#ff9900',
  AMD: '#ed1c24',
  Huawei: '#a32477',
  Unknown: '#666666',
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

function deriveRows(snapshots: OwnerSnapshot[]): DerivedRow[] {
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

    return {
      rank: i + 1,
      owner: s.owner,
      mappedLab,
      h100e: s.h100e,
      h100eLow: s.h100eLow,
      h100eHigh: s.h100eHigh,
      powerGw: s.powerMw / 1000,
      pctGlobal: (s.h100e / totalH100e) * 100,
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

function ChipMixCell({ row }: { row: DerivedRow }): JSX.Element {
  if (row.chipMix.length === 0) {
    return <span style={{ color: 'var(--color-text-quaternary)' }}>—</span>;
  }
  // Sort the segments by share descending so the legend matches the
  // visual prominence of the bar (biggest slice first). The bar itself
  // also draws in this order so the largest type sits on the left.
  const sorted = [...row.chipMix].sort((a, b) => b.pct - a.pct);

  return (
    <div className={styles.chipMix}>
      {/* ─── Stacked bar — one segment per chip type ─── */}
      <div className={styles.chipMixBar}>
        {sorted.map((seg, i) => (
          <div
            key={`${seg.chipType}-${i}`}
            className={styles.chipMixSegment}
            style={{ width: `${seg.pct}%`, background: seg.color }}
            aria-label={`${seg.chipType}: ${seg.pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* ─── Per-chip-type legend — the canonical info surface.
              Lists every chip type with its share, no hover required.   ─── */}
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

  const rows = useMemo<DerivedRow[]>(() => {
    if (!data) return [];
    return deriveRows(data.latestByOwner);
  }, [data]);

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
                <td className={styles.td}>
                  <ChipMixCell row={row} />
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
        Confidence bands derived from Epoch's Monte Carlo 5th/95th percentile spread.
        2029 projection uses our power-constrained per-lab targets where the owner
        maps cleanly to a tracked frontier lab; unmapped owners (Oracle, China, Other)
        show no projection. Power is total chip-level TDP (not facility power).
        Owner→Lab attribution is approximate — Epoch's "Microsoft" includes Bing/Office
        workloads and "Amazon" includes general AWS, not just OpenAI / Anthropic.
      </div>
    </div>
  );
}
