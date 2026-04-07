import type { Lab, TimeSeriesPoint, VelocityPoint } from '@/types';

/**
 * Annualized growth-rate series (trailing ~12 month lookback).
 *
 * For every point in `series` and every lab, find the closest earlier
 * snapshot that's at least 30 days back and compute:
 *
 *   rate = (current / past) ^ (1 / yearsElapsed)
 *
 * Returns one entry per source point, filtered to those where at least
 * one lab has a valid (non-null) growth rate.
 *
 * Ported 1:1 from ai-arms-race.html.
 */
export function buildVelocitySeries(
  series: readonly TimeSeriesPoint[],
  labs: readonly Lab[],
): VelocityPoint[] {
  if (!series || series.length < 2) return [];
  const LOOKBACK_DAYS = 365;

  const points: VelocityPoint[] = series.map((pt, idx) => {
    // Start with nulls; we'll overwrite with values where available.
    const vPt = { date: pt.date } as VelocityPoint;
    for (const lab of labs) {
      vPt[lab] = null;
      vPt[`${lab}_pw`] = null;
    }

    const ptDate = new Date(`${pt.date}T00:00:00`).getTime();

    for (const lab of labs) {
      const curH = pt[lab];
      const curP = pt[`${lab}_pw`];

      // Find the closest earlier point to exactly `LOOKBACK_DAYS` ago.
      let bestPt: { pt: TimeSeriesPoint; days: number } | null = null;
      let bestDist = Infinity;
      for (let j = idx - 1; j >= 0; j--) {
        const prevDate = new Date(`${series[j].date}T00:00:00`).getTime();
        const daysDiff = (ptDate - prevDate) / 86_400_000;
        if (daysDiff < 30) continue; // skip very short intervals (noise)
        const dist = Math.abs(daysDiff - LOOKBACK_DAYS);
        if (dist < bestDist) {
          bestDist = dist;
          bestPt = { pt: series[j], days: daysDiff };
        }
        if (daysDiff > LOOKBACK_DAYS * 1.5) break; // don't search too far
      }

      if (!bestPt) continue;

      const prevH = bestPt.pt[lab];
      const prevP = bestPt.pt[`${lab}_pw`];
      const yearsElapsed = bestPt.days / 365.25;

      vPt[lab] =
        prevH > 0 && curH > 0 ? Math.pow(curH / prevH, 1 / yearsElapsed) : null;
      vPt[`${lab}_pw`] =
        prevP > 0 && curP > 0 ? Math.pow(curP / prevP, 1 / yearsElapsed) : null;
    }

    return vPt;
  });

  return points.filter((pt) => labs.some((lab) => pt[lab] !== null));
}
