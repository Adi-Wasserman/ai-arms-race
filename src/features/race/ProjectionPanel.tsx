import { useMemo } from 'react';

import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { PROJ_2029_TARGETS } from '@/data/projections';
import { formatH100, formatPower } from '@/services/format';
import { useDashboard } from '@/store';
import { activeProj, activeSeries, getValue } from '@/store/selectors';
import type { Lab, TimeSeriesPoint } from '@/types';

import styles from './ProjectionPanel.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

function rankSymbol(i: number): string {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `${i + 1}.`;
}

interface Row {
  lab: Lab;
  val: number;
  h: number;
  p: number;
  growth?: number;
}

export function ProjectionPanel(): JSX.Element | null {
  const projMode = useDashboard((s) => s.projMode);
  const metric = useDashboard((s) => s.metric);
  const scope = useDashboard((s) => s.scope);
  const dataVersion = useDashboard((s) => s.dataVersion);

  const computed = useMemo(() => {
    if (projMode !== '2029') return null;
    const state = useDashboard.getState();
    const series = activeSeries(state);
    const past = series.filter((x) => x.date <= TODAY_ISO);
    const now = past.length > 0 ? past[past.length - 1] : null;
    if (!now) return null;

    const proj = activeProj(state);
    const end = proj.central.length > 0 ? proj.central[proj.central.length - 1] : null;
    if (!end) return null;

    const isPower = metric === 'power';

    const buildRows = (pt: TimeSeriesPoint, nowRef: TimeSeriesPoint | null): Row[] => {
      return LAB_NAMES.map((lab) => {
        const val = getValue(state, pt, lab);
        const growth =
          nowRef && getValue(state, nowRef, lab) > 0
            ? val / getValue(state, nowRef, lab)
            : undefined;
        return { lab, val, h: pt[lab], p: pt[`${lab}_pw`], growth };
      })
        .filter((r) => r.val > 0)
        .sort((a, b) => (isPower ? b.p - a.p : b.h - a.h));
    };

    return {
      now,
      end,
      nowRows: buildRows(now, null),
      projRows: buildRows(end, now),
    };
  }, [projMode, metric, scope, dataVersion]);

  if (!computed) return null;
  const { now, end, nowRows, projRows } = computed;

  return (
    <div className={styles.panel}>
      <div className={styles.columns}>
        <div className={`${styles.column} ${styles.now}`}>
          <div className={`${styles.colHeading} ${styles.now}`}>
            📊 APR 2026 — OBSERVED
          </div>
          {nowRows.map((r, i) => (
            <div key={r.lab} className={styles.row}>
              <span className={styles.rank}>{rankSymbol(i)}</span>
              <span
                className={styles.labName}
                style={{ color: LAB_COLORS[r.lab] }}
              >
                {r.lab}
              </span>
              <span className={styles.primary}>{formatH100(r.h)}</span>
              <span className={styles.secondary}>{formatPower(r.p)}</span>
            </div>
          ))}
          <div className={`${styles.total} ${styles.now}`}>
            TOTAL: {formatH100(now.tH)} H100e · {formatPower(now.tP)}
          </div>
        </div>

        <div className={styles.arrow}>→</div>

        <div className={`${styles.column} ${styles.future}`}>
          <div className={`${styles.colHeading} ${styles.future}`}>
            ⚡ JAN 2029 — PROJECTED
          </div>
          {projRows.map((r, i) => (
            <div key={r.lab} className={`${styles.row} ${styles.future}`}>
              <span className={styles.rank}>{rankSymbol(i)}</span>
              <span
                className={styles.labName}
                style={{ color: LAB_COLORS[r.lab] }}
              >
                {r.lab}
              </span>
              <span className={styles.primary}>{formatH100(r.h)}</span>
              <span className={styles.growth}>
                {r.growth !== undefined ? `${Math.round(r.growth)}×` : '—'}
              </span>
            </div>
          ))}
          <div className={`${styles.total} ${styles.future}`}>
            TOTAL: {formatH100(end.tH)} H100e · {formatPower(end.tP)}
          </div>
        </div>
      </div>

      <div className={styles.assumptions}>
        <div className={styles.assumptionsHeading}>GROWTH ASSUMPTIONS</div>
        <div className={styles.cards}>
          {LAB_NAMES.map((lab) => {
            const t = PROJ_2029_TARGETS[lab];
            const nowH = now[lab];
            const growthX = nowH > 0 ? (t.h / nowH).toFixed(1) : '—';
            return (
              <div key={lab} className={styles.card}>
                <div className={styles.cardLab} style={{ color: LAB_COLORS[lab] }}>
                  {lab}
                </div>
                <div className={styles.cardLine}>
                  Target: <strong>{formatH100(t.h)}</strong> H100e
                </div>
                <div className={styles.cardLine}>
                  Power: <strong>{formatPower(t.p)}</strong>
                </div>
                <div className={styles.cardGrowth}>Growth: ~{growthX}×</div>
                <div className={styles.cardBasis}>{t.basis}</div>
              </div>
            );
          })}
        </div>
        <div className={styles.footnote}>
          Projections use explicit per-lab Jan 2029 targets derived from Epoch
          satellite facility ramps (Layer 1) + sourced cloud-lease fleet growth (Layer
          2). <strong>No speculative new facilities.</strong> Power is the binding
          constraint — new grid capacity requires 2-5 year interconnection queues.
          Chip efficiency improvements (GB200, Trainium3, Ironwood) are factored into
          H100e-per-MW ratios. Uncertainty bands widen ±8% base + 6%/year.{' '}
          <strong>
            These are target-based interpolations, not compound growth forecasts.
          </strong>
        </div>
      </div>
    </div>
  );
}
