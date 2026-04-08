import { useEffect, useMemo, useRef } from 'react';

import {
  LAB_OWNERSHIP_CONFIG,
  PCT_OWNED_FOOTNOTE,
  PCT_OWNED_TOOLTIP,
} from '@/config/labOwnershipMapping';
import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { PROJ_2029_TARGETS } from '@/data/projections';
import { useEpochChipOwners } from '@/hooks/useEpochChipOwners';
import { formatH100 } from '@/services/format';
import {
  MFR_COLORS,
  computeOwnedH100e,
  computePctOwned,
  type ManufacturerSegment,
  type OwnedH100eResult,
  type PctOwnedResult,
} from '@/services/ownershipMath';
import { useDashboard } from '@/store';
import {
  type ChipManufacturer,
  type EpochChipOwnersData,
  type Lab,
  OWNER_TO_LAB,
} from '@/types';

import styles from './OwnershipTable.module.css';

/* ─────────────────────────────────────────────────────────────
   OwnershipLabTable — the lab-row view for raceMode=ownership.

   Differs from the original (operator-row) OwnershipTable by
   pivoting the table on labs, not Epoch operators. Data flows
   only through each lab's `selfOwned` entries in
   LAB_OWNERSHIP_CONFIG, so:

   - Gemini, Meta, xAI display their directly-owned fleet
     (their own parent / operator snapshot).
   - OpenAI and Anthropic display 0 — by design. Epoch attributes
     those chips to Microsoft and Amazon respectively, not to the
     labs themselves, and the established editorial discipline of
     this project is never to re-label a hyperscaler's bulk as a
     frontier lab's own.

   Columns: Rank | Lab | Owned H100e (Epoch median) | Power (GW)
            | Chip Mix | % of Global | 2029 Projection | % Owned
   ───────────────────────────────────────────────────────────── */

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const TOOLTIP_TEXT =
  'Pure-Epoch lab view. Every number is pulled directly from the live ' +
  'Epoch AI Chip Owners ZIP via each lab\'s LAB_OWNERSHIP_CONFIG.selfOwned ' +
  'entries — no re-attribution of hyperscaler totals. ' +
  'https://epoch.ai/data/ai_chip_owners.zip';

interface LabRow {
  lab: Lab;
  rank: number;
  owned: OwnedH100eResult;
  /** Total power (MW) summed across the lab's selfOwned snapshots. */
  powerMw: number;
  /** Manufacturer-level chip mix for the lab's selfOwned snapshots. */
  chipMix: ManufacturerSegment[] | null;
  pctGlobal: number;
  proj2029: number | null;
  proj2029Growth: number | null;
  pctOwned: PctOwnedResult | null;
}

function buildLabRows(
  chipOwners: EpochChipOwnersData,
  fleetByLab: Partial<Record<Lab, number>>,
): LabRow[] {
  // Global denominator — total median H100e across every owner in
  // the ZIP. Gives "% of Global" a consistent total regardless of
  // which owners we attribute to the 5 tracked labs.
  const globalTotal =
    chipOwners.latestByOwner.reduce((s, x) => s + x.h100e, 0) || 1;

  const rows: LabRow[] = LAB_NAMES.map((lab) => {
    const owned = computeOwnedH100e(lab, chipOwners);
    const cfg = LAB_OWNERSHIP_CONFIG[lab];

    // Aggregate power + manufacturer rollup across the lab's
    // selfOwned snapshots only. For OpenAI and Anthropic (no
    // selfOwned entries) this leaves powerMw=0 and chipMix=null
    // — rendered as "—" in the table.
    let powerMw = 0;
    const mfrSums = new Map<string, number>();
    let mfrTotal = 0;
    for (const name of cfg.selfOwned) {
      const snap = chipOwners.latestByOwner.find((s) => s.owner === name);
      if (!snap) continue;
      powerMw += snap.powerMw;
      mfrTotal += snap.h100e;
      for (const c of snap.byChipType) {
        mfrSums.set(c.manufacturer, (mfrSums.get(c.manufacturer) ?? 0) + c.h100e);
      }
    }
    const chipMix: ManufacturerSegment[] | null =
      mfrTotal > 0
        ? Array.from(mfrSums.entries())
            .map(([mfr, h]) => ({
              manufacturer: mfr,
              pct: (h / mfrTotal) * 100,
              h100e: h,
              color:
                MFR_COLORS[mfr as ChipManufacturer] ?? MFR_COLORS.Unknown,
            }))
            .sort((a, b) => b.pct - a.pct)
        : null;

    const projTarget = PROJ_2029_TARGETS[lab];
    const proj2029 = projTarget ? projTarget.h : null;
    const proj2029Growth =
      projTarget && owned.median > 0 ? projTarget.h / owned.median : null;

    const pctOwned =
      fleetByLab[lab] !== undefined
        ? computePctOwned(lab, fleetByLab[lab] ?? 0, chipOwners)
        : null;

    return {
      lab,
      rank: 0, // set after sort
      owned,
      powerMw,
      chipMix,
      pctGlobal: (owned.median / globalTotal) * 100,
      proj2029,
      proj2029Growth,
      pctOwned,
    };
  });

  // Sort by owned median desc, then renumber ranks 1..N.
  rows.sort((a, b) => b.owned.median - a.owned.median);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

function rankClass(rank: number): string {
  if (rank === 1) return styles.rankGold;
  if (rank === 2) return styles.rankSilver;
  if (rank === 3) return styles.rankBronze;
  return styles.rankDefault;
}

/* ─────────────────────────────────────────────────────────────
   Chip-mix cell — manufacturer-level stacked bar + rollup.

   Simpler than the OwnershipTable chip-mix cell (no portal
   tooltip, no per-chip-type legend) because at lab granularity
   the manufacturer is the meaningful axis — chip-type detail
   lives in the OwnershipSidePanel + original OwnershipTable.
   ───────────────────────────────────────────────────────────── */
function ChipMixCell({
  segments,
}: {
  segments: ManufacturerSegment[] | null;
}): JSX.Element {
  if (!segments || segments.length === 0) {
    return <span className={styles.projMuted}>—</span>;
  }
  return (
    <div className={styles.chipMix}>
      <div className={styles.chipMixBar}>
        {segments.map((seg) => (
          <div
            key={seg.manufacturer}
            className={styles.chipMixSegment}
            style={{ width: `${seg.pct}%`, background: seg.color }}
            title={`${seg.manufacturer}: ${formatH100(seg.h100e)} (${seg.pct.toFixed(0)}%)`}
            aria-label={`${seg.manufacturer}: ${seg.pct.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className={styles.chipMixMfrRollup}>
        {segments.map((seg, i) => (
          <span key={seg.manufacturer}>
            {i > 0 && <span className={styles.chipMixMfrSep}> · </span>}
            <span
              className={styles.chipMixMfrName}
              style={{ color: seg.color }}
            >
              {seg.manufacturer}
            </span>{' '}
            <span className={styles.chipMixMfrPct}>
              {seg.pct.toFixed(0)}%
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

export function OwnershipLabTable(): JSX.Element {
  const { data, loading, error, lastUpdated, fromCache, refresh } =
    useEpochChipOwners();

  const seriesFull = useDashboard((s) => s.seriesFull);
  const dataVersion = useDashboard((s) => s.dataVersion);
  // Owner name set by OwnershipSidePanel cards — we map it to a lab
  // via OWNER_TO_LAB and highlight that lab's row instead.
  const highlightedOwner = useDashboard((s) => s.highlightedOwner);
  const setHighlightedOwner = useDashboard((s) => s.setHighlightedOwner);

  const rowRefs = useRef<Map<Lab, HTMLTableRowElement>>(new Map());

  useEffect(() => {
    if (!highlightedOwner) return;
    const mappedLab = OWNER_TO_LAB[
      highlightedOwner as keyof typeof OWNER_TO_LAB
    ] as Lab | undefined;
    if (!mappedLab) return;
    const row = rowRefs.current.get(mappedLab);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const t = window.setTimeout(() => {
      setHighlightedOwner(null);
    }, 1800);
    return () => window.clearTimeout(t);
  }, [highlightedOwner, setHighlightedOwner]);

  const rows = useMemo<LabRow[]>(() => {
    if (!data) return [];
    const past = seriesFull.filter((x) => x.date <= TODAY_ISO);
    const fullPt = past.length > 0 ? past[past.length - 1] : null;
    const fleetByLab: Partial<Record<Lab, number>> = {};
    if (fullPt) {
      LAB_NAMES.forEach((lab) => {
        fleetByLab[lab] = fullPt[lab];
      });
    }
    return buildLabRows(data, fleetByLab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dataVersion]);

  // ── Loading / error states ──
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
          <span className={styles.metaLabel}>Ownership (lab view) · </span>
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
            <th className={styles.th}>LAB</th>
            <th className={`${styles.th} ${styles.right}`}>
              OWNED H100e (EPOCH MEDIAN)
            </th>
            <th className={`${styles.th} ${styles.right}`}>POWER (GW)</th>
            <th className={styles.th}>CHIP MIX</th>
            <th className={`${styles.th} ${styles.right}`}>% OF GLOBAL</th>
            <th className={`${styles.th} ${styles.right}`}>2029 PROJECTION</th>
            <th
              className={`${styles.th} ${styles.right}`}
              title={PCT_OWNED_TOOLTIP}
            >
              % OWNED ⓘ
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const labColor = LAB_COLORS[row.lab];
            const isZeroLab = !row.owned.isDerivedFromEpoch;
            const mappedFromHighlight = highlightedOwner
              ? (OWNER_TO_LAB[
                  highlightedOwner as keyof typeof OWNER_TO_LAB
                ] as Lab | undefined)
              : undefined;
            const isHighlighted = mappedFromHighlight === row.lab;
            return (
              <tr
                key={row.lab}
                ref={(el) => {
                  if (el) rowRefs.current.set(row.lab, el);
                  else rowRefs.current.delete(row.lab);
                }}
                className={`${styles.row}${isHighlighted ? ` ${styles.rowHighlight}` : ''}`}
              >
                <td className={styles.td}>
                  <div className={`${styles.rank} ${rankClass(row.rank)}`}>
                    {row.rank}
                  </div>
                </td>
                <td className={styles.td}>
                  <div
                    className={styles.ownerName}
                    style={{ color: isZeroLab ? '#9a9a9a' : labColor }}
                  >
                    {row.lab}
                  </div>
                  {isZeroLab && (
                    <div className={styles.ownerSub}>
                      cloud-dependent †
                    </div>
                  )}
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  {row.owned.isDerivedFromEpoch ? (
                    <>
                      <div className={styles.h100eMain}>
                        {formatH100(row.owned.median)}
                      </div>
                      <div className={styles.h100eRange}>
                        {formatH100(row.owned.low)} – {formatH100(row.owned.high)}
                      </div>
                    </>
                  ) : (
                    <span
                      className={styles.projMuted}
                      title="No first-party chip ownership in Epoch's dataset — see footnote †"
                    >
                      0 <sup>†</sup>
                    </span>
                  )}
                </td>
                <td className={`${styles.td} ${styles.right} ${styles.power}`}>
                  {row.powerMw > 0 ? (
                    `${(row.powerMw / 1000).toFixed(2)} GW`
                  ) : (
                    <span className={styles.projMuted}>—</span>
                  )}
                </td>
                <td className={styles.td}>
                  <ChipMixCell segments={row.chipMix} />
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
                          background: isZeroLab ? '#666' : labColor,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  {row.proj2029 != null ? (
                    <>
                      <div className={styles.proj}>
                        {formatH100(row.proj2029)}
                      </div>
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
                <td
                  className={`${styles.td} ${styles.right}`}
                  title={
                    row.pctOwned != null
                      ? (row.pctOwned.footnote ?? PCT_OWNED_TOOLTIP)
                      : PCT_OWNED_TOOLTIP
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
                            background: isZeroLab ? '#666' : labColor,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className={styles.projMuted}>—</span>
                  )}
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
        <strong style={{ color: 'rgba(255,255,255,0.75)' }}>
          † Owned H100e numbers are the raw median values directly from Epoch
          AI Chip Owners ZIP (live). % Owned for OpenAI and Anthropic uses the
          documented override because Epoch attributes those chips to the
          hyperscalers, not the labs. All other values are 100% data-derived
          with no manual adjustment.
        </strong>
        <br />
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{TOOLTIP_TEXT}</span>
        <br />
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>
          * {PCT_OWNED_FOOTNOTE}
        </span>
        <br />
        Power, Chip Mix, and % of Global are summed from each lab's{' '}
        <code>selfOwned</code> Epoch snapshots only — never from a hyperscaler
        partner's totals. 2029 Projection uses the power-constrained per-lab
        targets from <code>PROJ_2029_TARGETS</code>.
      </div>
    </div>
  );
}
