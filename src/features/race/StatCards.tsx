import { useMemo } from 'react';

import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { PROJ_2029_TARGETS } from '@/data/projections';
import { formatH100, formatPower } from '@/services/format';
import { detectLeadChanges } from '@/services/timeseries';
import { buildVelocitySeries } from '@/services/velocity';
import { useDashboard } from '@/store';
import {
  activeProj,
  activeSeries,
  getValue,
} from '@/store/selectors';
import type { Lab } from '@/types';

import styles from './StatCards.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

interface Stats {
  current: ReturnType<typeof activeSeries>[number] | null;
  leader: Lab | null;
  maxVal: number;
  secondLab: Lab | null;
  secondVal: number;
  pastLeadChanges: number;
  futureLeadChanges: number;
}

function computeStats(
  state: ReturnType<typeof useDashboard.getState>,
): Stats {
  const series = activeSeries(state);
  const past = series.filter((x) => x.date <= TODAY_ISO);
  const current = past.length > 0 ? past[past.length - 1] : null;
  if (!current) {
    return {
      current: null,
      leader: null,
      maxVal: 0,
      secondLab: null,
      secondVal: 0,
      pastLeadChanges: 0,
      futureLeadChanges: 0,
    };
  }

  let leader: Lab | null = null;
  let maxVal = 0;
  for (const lab of LAB_NAMES) {
    const v = getValue(state, current, lab);
    if (v > maxVal) {
      maxVal = v;
      leader = lab;
    }
  }

  let secondLab: Lab | null = null;
  let secondVal = 0;
  for (const lab of LAB_NAMES) {
    if (lab === leader) continue;
    const v = getValue(state, current, lab);
    if (v > secondVal) {
      secondVal = v;
      secondLab = lab;
    }
  }

  const changes = detectLeadChanges(series, state.metric, LAB_NAMES);
  return {
    current,
    leader,
    maxVal,
    secondLab,
    secondVal,
    pastLeadChanges: changes.filter((c) => c.date <= TODAY_ISO).length,
    futureLeadChanges: changes.filter((c) => c.date > TODAY_ISO).length,
  };
}

export function StatCards(): JSX.Element | null {
  const metric = useDashboard((s) => s.metric);
  const scope = useDashboard((s) => s.scope);
  const projMode = useDashboard((s) => s.projMode);
  const velocityMode = useDashboard((s) => s.velocityMode);
  const dataVersion = useDashboard((s) => s.dataVersion);

  const stats = useMemo(
    () => computeStats(useDashboard.getState()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metric, scope, projMode, dataVersion],
  );

  const keyFinding = useMemo(() => {
    if (!stats.current || !stats.leader) return null;

    const state = useDashboard.getState();

    // 2029 mode: renderProjPanel-equivalent, handled by ProjectionPanel.
    // Here we emit a projection-flavored finding too.
    if (projMode === '2029') {
      const proj = activeProj(state);
      const end = proj.central.length > 0 ? proj.central[proj.central.length - 1] : null;
      if (!end) return null;

      let projLeader: Lab | null = null;
      let projMax = 0;
      for (const lab of LAB_NAMES) {
        const v = getValue(state, end, lab);
        if (v > projMax) {
          projMax = v;
          projLeader = lab;
        }
      }
      const nowTotal = metric === 'power' ? stats.current.tP : stats.current.tH;
      const projTotal = metric === 'power' ? end.tP : end.tH;
      const totalGrowth = nowTotal > 0 ? (projTotal / nowTotal).toFixed(1) : '—';
      const unit = metric === 'power' ? 'MW' : 'H100e';

      return (
        <>
          ⚡{' '}
          <strong className={styles.projection}>
            2029 PROJECTION (power-constrained):
          </strong>{' '}
          <strong style={{ color: projLeader ? LAB_COLORS[projLeader] : undefined }}>
            {projLeader}
          </strong>{' '}
          is projected to lead by Jan 2029 with{' '}
          <strong>
            {formatH100(projMax)} {unit}
          </strong>
          . Total industry compute grows <strong>~{totalGrowth}×</strong> from{' '}
          {formatH100(nowTotal)} to {formatH100(projTotal)}.{' '}
          <span className={styles.muted}>
            Targets derived from Epoch satellite ramps (Layer 1) + sourced cloud-lease
            fleet growth (Layer 2). No speculative facilities. Power is the binding
            constraint. ±20% uncertainty.
          </span>
        </>
      );
    }

    if (velocityMode === 'velocity') {
      const past = activeSeries(state).filter((x) => x.date <= TODAY_ISO);
      const velocity = buildVelocitySeries(past, LAB_NAMES);
      const recent = velocity.length > 0 ? velocity[velocity.length - 1] : null;
      if (!recent) return null;
      const rates = LAB_NAMES.map((lab) => {
        const key = metric === 'power' ? (`${lab}_pw` as const) : lab;
        return { lab, rate: recent[key] ?? 0 };
      })
        .filter((r) => r.rate > 0)
        .sort((a, b) => b.rate - a.rate);
      if (rates.length < 2) return null;
      return (
        <>
          📈 <strong>GROWTH VELOCITY:</strong>{' '}
          <strong style={{ color: LAB_COLORS[rates[0].lab] }}>{rates[0].lab}</strong> is
          growing fastest at <strong>{rates[0].rate.toFixed(1)}×/yr</strong>, followed
          by{' '}
          <strong style={{ color: LAB_COLORS[rates[1].lab] }}>{rates[1].lab}</strong> at{' '}
          {rates[1].rate.toFixed(1)}×/yr.{' '}
          <span className={styles.muted}>
            Growth rates are annualized from trailing 12-month data. Sustained rates
            above 4×/yr require massive new facility buildout.
          </span>
        </>
      );
    }

    const unit = metric === 'power' ? 'MW' : 'H100e';
    const gap =
      stats.maxVal > 0 && stats.secondVal > 0
        ? Math.round(((stats.maxVal - stats.secondVal) / stats.secondVal) * 100)
        : 0;
    return (
      <>
        <strong style={{ color: LAB_COLORS[stats.leader] }}>{stats.leader}</strong>{' '}
        leads with{' '}
        <strong>
          {formatH100(stats.maxVal)} {unit}
        </strong>
        {stats.secondLab && (
          <>
            , {gap}% ahead of{' '}
            <strong style={{ color: LAB_COLORS[stats.secondLab] }}>
              {stats.secondLab}
            </strong>
          </>
        )}
        . The lead has changed <strong>{stats.pastLeadChanges} times</strong> since 2023
        — and {stats.futureLeadChanges} more projected shifts are ahead.
      </>
    );
  }, [stats, metric, projMode, velocityMode]);

  if (!stats.current || !stats.leader) return null;

  const leaderH = stats.current[stats.leader];
  const leaderP = stats.current[`${stats.leader}_pw`];

  return (
    <>
      <div className={styles.keyFinding}>{keyFinding}</div>
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>LEADER TODAY</div>
          <div
            className={styles.statValue}
            style={{ color: LAB_COLORS[stats.leader] }}
          >
            {stats.leader}
          </div>
          <div className={styles.statSub}>
            {formatH100(leaderH)} H100e · {formatPower(leaderP)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>TOTAL COMPUTE</div>
          <div className={styles.statValue}>
            {formatH100(stats.current.tH)}
            <span className={styles.statSub}>H100e</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>TOTAL POWER</div>
          <div className={styles.statValue}>
            {formatPower(stats.current.tP)}
            <span className={styles.statSub}>all labs</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>LEAD CHANGES</div>
          <div className={styles.statValue}>
            {stats.pastLeadChanges}
            <span className={styles.statSub}>
              obs +{stats.futureLeadChanges} proj
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// Reference so TypeScript includes PROJ_2029_TARGETS when tree-shaking dev builds.
void PROJ_2029_TARGETS;
