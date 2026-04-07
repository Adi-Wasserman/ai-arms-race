import type {
  Lab,
  LabColorMap,
  ProjectionBands,
  ProjectionTargetMap,
  TimeSeriesPoint,
  UncertaintyBand,
} from '@/types';

/**
 * Power-constrained 2029 projection engine.
 *
 * Instead of compound-growth extrapolation (which produced physically
 * impossible results), this interpolates from today's observed values to
 * explicit per-lab Jan 2029 targets using an ease-out curve:
 *
 *   t     = 1 - (1 - elapsed) ** 1.8
 *   value = start + (target - start) * t
 *
 * The ease-out (exponent 1.8) matches the observed deceleration pattern
 * (7.4× → 5.3× → 2.6× → 2.6×) where most capacity comes online mid-period
 * and growth decelerates as targets approach.
 *
 * `uncertainty` widens the band over time:
 *   unc = base + perYear * yearsElapsed
 *
 * Quarterly output points are generated from the anchor (today's last
 * observed snapshot) to `projEnd` inclusive.
 *
 * Ported 1:1 from ai-arms-race.html.
 */
export function buildProjections2029(
  series: readonly TimeSeriesPoint[],
  labs: readonly Lab[],
  targets: ProjectionTargetMap,
  projEnd: string,
  uncertainty: UncertaintyBand,
  today: string,
): ProjectionBands {
  if (!series || series.length === 0) {
    return { central: [], low: [], high: [] };
  }

  const observed = series.filter((pt) => pt.date <= today);
  const anchor = observed.length > 0 ? observed[observed.length - 1] : series[series.length - 1];
  const anchorDate = new Date(`${anchor.date}T00:00:00`);
  const endDate = new Date(`${projEnd}T00:00:00`);
  const totalMs = endDate.getTime() - anchorDate.getTime();

  if (totalMs <= 0) return { central: [], low: [], high: [] };

  // Generate quarterly dates: snap anchor to the next quarter boundary, then
  // step +3 months until we pass projEnd.
  const dates: string[] = [];
  const cur = new Date(anchorDate);
  cur.setMonth(cur.getMonth() + 3 - (cur.getMonth() % 3));
  cur.setDate(1);
  while (cur <= endDate) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setMonth(cur.getMonth() + 3);
  }
  if (dates.length === 0 || dates[dates.length - 1] !== projEnd) {
    dates.push(projEnd);
  }

  const central: TimeSeriesPoint[] = [];
  const low: TimeSeriesPoint[] = [];
  const high: TimeSeriesPoint[] = [];

  for (const d of dates) {
    let elapsed = (new Date(`${d}T00:00:00`).getTime() - anchorDate.getTime()) / totalMs;
    if (elapsed <= 0) continue;
    if (elapsed > 1) elapsed = 1;

    // Ease-out: fast early ramp, decelerating toward target.
    const t = 1 - Math.pow(1 - elapsed, 1.8);

    const yearsElapsed =
      (new Date(`${d}T00:00:00`).getTime() - anchorDate.getTime()) / (365.25 * 86_400_000);
    const unc = uncertainty.base + uncertainty.perYear * yearsElapsed;

    const ptC = { date: d, tH: 0, tP: 0 } as TimeSeriesPoint;
    const ptL = { date: d, tH: 0, tP: 0 } as TimeSeriesPoint;
    const ptH = { date: d, tH: 0, tP: 0 } as TimeSeriesPoint;

    for (const lab of labs) {
      const target = targets[lab];
      const startH = anchor[lab];
      const startP = anchor[`${lab}_pw`];

      // Hold flat if target ever dips below current (shouldn't happen).
      const endH = Math.max(target.h, startH);
      const endP = Math.max(target.p, startP);

      const projH = Math.round(startH + (endH - startH) * t);
      const projP = Math.round(startP + (endP - startP) * t);

      ptC[lab] = projH;
      ptC[`${lab}_pw`] = projP;
      ptL[lab] = Math.round(projH * (1 - unc));
      ptL[`${lab}_pw`] = Math.round(projP * (1 - unc));
      ptH[lab] = Math.round(projH * (1 + unc));
      ptH[`${lab}_pw`] = Math.round(projP * (1 + unc));
    }

    for (const lab of labs) {
      ptC.tH += ptC[lab];
      ptC.tP += ptC[`${lab}_pw`];
      ptL.tH += ptL[lab];
      ptL.tP += ptL[`${lab}_pw`];
      ptH.tH += ptH[lab];
      ptH.tP += ptH[`${lab}_pw`];
    }

    central.push(ptC);
    low.push(ptL);
    high.push(ptH);
  }

  return { central, low, high };
}

/** Re-exported for downstream typing convenience. */
export type { LabColorMap };
