import { useMemo } from 'react';

import { Toggle } from '@/components/ui/Toggle';
import { PCT_OWNED_TOOLTIP } from '@/config/labOwnershipMapping';
import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { formatH100, formatPower } from '@/services/format';
import {
  computeManufacturerMix,
  computeOwnedH100e,
  computePctOwned,
  type ManufacturerSegment,
  type OwnedH100eResult,
  type PctOwnedResult,
} from '@/services/ownershipMath';
import { useDashboard } from '@/store';
import {
  activeProj,
  activeSeries,
  activeSeriesWithProj,
  getValue,
} from '@/store/selectors';
import type { Lab, ScopeMode } from '@/types';

import styles from './Leaderboard.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const SCOPE_OPTIONS = [
  { value: 'fleet' as const, label: 'TOTAL CAPACITY' },
  { value: 'tracked' as const, label: 'SATELLITE ONLY' },
];

interface Row {
  lab: Lab;
  h: number;
  p: number;
  /** Hybrid % Owned result: Epoch-derived chip ownership ÷ effective fleet. */
  pctOwned: PctOwnedResult | null;
  /** Raw Epoch median owned H100e — no denominator, no overrides. */
  ownedH100eEpoch: OwnedH100eResult | null;
  /** Manufacturer-rollup chip mix — surfaced via the OWNED bar's hover
      tooltip only. The full bar lives in OwnershipTable / OwnershipSidePanel. */
  chipMix: ManufacturerSegment[] | null;
}

function rankClass(i: number): string {
  if (i === 0) return styles.rankGold;
  if (i === 1) return styles.rankSilver;
  if (i === 2) return styles.rankBronze;
  return styles.rankDefault;
}

/**
 * Compose the OWNED bar's hover tooltip. Combines the % Owned
 * footnote (override caveats etc.) with a one-line chip-mix
 * summary so the chip-manufacturer info is still discoverable
 * after the dedicated CHIPS row was removed for being visually
 * redundant with the OWNED bar.
 */
function buildOwnedTitle(
  pct: PctOwnedResult,
  chipMix: ManufacturerSegment[] | null,
): string {
  const base = pct.footnote ?? PCT_OWNED_TOOLTIP;
  if (!chipMix || chipMix.length === 0) return base;
  const mfrLine = chipMix
    .map((s) => `${s.manufacturer} ${Math.round(s.pct)}%`)
    .join(' · ');
  return `${base} · Chip mix: ${mfrLine}`;
}

export function Leaderboard(): JSX.Element | null {
  const metric = useDashboard((s) => s.metric);
  const scope = useDashboard((s) => s.scope);
  const projMode = useDashboard((s) => s.projMode);
  const setScope = useDashboard((s) => s.setScope);
  const dataVersion = useDashboard((s) => s.dataVersion);
  // Live chip ownership data + version stamp for memo invalidation.
  const chipOwners = useDashboard((s) => s.chipOwners);
  const chipOwnersVersion = useDashboard((s) => s.chipOwnersVersion);

  const content = useMemo(() => {
    const state = useDashboard.getState();
    const is2029 = projMode === '2029';
    const series = is2029 ? activeSeriesWithProj(state) : activeSeries(state);
    const past = series.filter((x) => x.date <= TODAY_ISO);
    const pt = past.length > 0 ? past[past.length - 1] : null;
    if (!pt) return null;

    const proj = is2029 ? activeProj(state) : null;
    const proj2029Pt =
      proj && proj.central.length > 0 ? proj.central[proj.central.length - 1] : null;

    // % Owned uses the full fleet (+cloud lease) as the denominator
    // regardless of current scope toggle — the ratio is "of lab's
    // total effective fleet, how much hardware do they actually own".
    const seriesFull = state.seriesFull;
    const fullPast = seriesFull.filter((x) => x.date <= TODAY_ISO);
    const fullPt = fullPast.length > 0 ? fullPast[fullPast.length - 1] : null;

    const rows: Row[] = LAB_NAMES.map((lab) => ({
      lab,
      h: pt[lab],
      p: pt[`${lab}_pw`],
      pctOwned: fullPt
        ? computePctOwned(lab, fullPt[lab], chipOwners)
        : null,
      ownedH100eEpoch: computeOwnedH100e(lab, chipOwners),
      chipMix: computeManufacturerMix(lab, chipOwners),
    })).filter((r) => r.h > 0 || r.p > 0);

    rows.sort((a, b) => (metric === 'power' ? b.p - a.p : b.h - a.h));

    const maxVal =
      Math.max(...rows.map((r) => (metric === 'power' ? r.p : r.h))) || 1;
    const totalH = rows.reduce((s, r) => s + r.h, 0);
    const totalP = rows.reduce((s, r) => s + r.p, 0);

    return { pt, rows, maxVal, totalH, totalP, proj2029Pt, is2029 };
    // chipOwnersVersion drives recompute when the ZIP refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, scope, projMode, dataVersion, chipOwnersVersion]);

  if (!content) return null;
  const { rows, maxVal, totalH, totalP, proj2029Pt, is2029 } = content;

  return (
    <div className={styles.container}>
      <div className={styles.heading}>WHO'S WINNING</div>
      <div className={styles.scopeBar}>
        <Toggle<ScopeMode>
          value={scope}
          options={SCOPE_OPTIONS}
          onChange={setScope}
          ariaLabel="Scope (leaderboard)"
        />
      </div>
      <div className={styles.dateLine}>
        <span style={{ color: '#00ff87' }}>●</span>{' '}
        {new Date(TODAY_ISO).toLocaleDateString(undefined, {
          month: 'short',
          year: 'numeric',
        })}
        {is2029 && (
          <span style={{ color: 'rgba(255,170,0,0.6)', marginLeft: 6 }}>
            → 2029
          </span>
        )}
      </div>

      <div className={styles.rows}>
        {rows.map((r, i) => {
          const val = metric === 'power' ? r.p : r.h;
          const barW = Math.round((val / maxVal) * 100);
          const color = LAB_COLORS[r.lab];

          const pH = proj2029Pt?.[r.lab] ?? 0;
          const pP = proj2029Pt?.[`${r.lab}_pw`] ?? 0;
          const nowVal = metric === 'power' ? r.p : r.h;
          const projVal = metric === 'power' ? pP : pH;
          const growth = nowVal > 0 ? Math.round(projVal / nowVal) : 0;

          return (
            <div key={r.lab} className={styles.row}>
              <div className={`${styles.rank} ${rankClass(i)}`}>{i + 1}</div>
              <div className={styles.rowBody}>
                <div className={styles.labName} style={{ color }}>
                  {r.lab}
                </div>
                <div className={styles.metrics}>
                  <strong>{formatH100(r.h)}</strong>
                  <span className={styles.metricLabel}> H100e</span>
                  {' · '}
                  <strong>{formatPower(r.p)}</strong>
                  {r.pctOwned != null && (
                    <>
                      {' · '}
                      <span
                        className={styles.ownedInline}
                        title={buildOwnedTitle(r.pctOwned, r.chipMix)}
                      >
                        <strong>{r.pctOwned.pct}%</strong>
                        <span className={styles.metricLabel}> owned</span>
                      </span>
                    </>
                  )}
                </div>
                {proj2029Pt && (
                  <div className={styles.projLine}>
                    ⚡ 2029: <strong>{formatH100(pH)}</strong> · {formatPower(pP)} ·{' '}
                    <strong>{growth}×</strong>
                  </div>
                )}
                <div className={styles.bar}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${barW}%`, background: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.total}>
        <span className={styles.totalLabel}>TOTAL</span>
        <span className={styles.totalValue}>
          {formatH100(totalH)} · {formatPower(totalP)}
        </span>
      </div>
      {proj2029Pt && (
        <div className={styles.total2029}>
          <span>⚡ 2029 TOTAL</span>
          <span>
            {formatH100(proj2029Pt.tH)} · {formatPower(proj2029Pt.tP)}
          </span>
        </div>
      )}
      {scope === 'fleet' && (
        <div className={styles.disclaimer}>
          ⚠ Includes cloud-lease estimates. See calculations below.
        </div>
      )}
    </div>
  );
}
