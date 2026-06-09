import type { Lab, TimeSeriesPoint } from '@/types';

/**
 * 2029 target accountability — is each lab's observed buildout on the
 * pace its announced target requires?
 *
 * Method (deliberately simple and falsifiable):
 *   requiredPerQuarter = (target − observedNow) / quarters remaining
 *   trailingPerQuarter = observed growth over the trailing window,
 *                        normalized to a quarter
 *   paceRatio          = trailing / required
 *
 * The comparison basis is the TOTAL CAPACITY series (satellite +
 * estimate legs) because the announced targets are total-fleet numbers.
 * Both sides of the ratio share that basis, so estimate-leg uncertainty
 * partially cancels — but the caveat still belongs in the UI.
 */

export type PaceStatus =
  | 'MET'
  | 'AHEAD'
  | 'ON PACE'
  | 'BEHIND'
  | 'FAR BEHIND'
  | 'NO DATA';

export interface PaceResult {
  lab: Lab;
  observedNow: number;
  targetH: number;
  /** H100e per quarter needed from today to hit the target on time. */
  requiredPerQuarter: number;
  /** Observed H100e added per quarter over the trailing window. */
  trailingPerQuarter: number;
  /** trailing ÷ required. Null when required ≤ 0 (target met). */
  paceRatio: number | null;
  status: PaceStatus;
  trailingWindowDays: number;
}

const DAY_MS = 86_400_000;
const QUARTER_MS = 91.31 * DAY_MS;

function statusFor(ratio: number): PaceStatus {
  if (ratio >= 1.15) return 'AHEAD';
  if (ratio >= 0.85) return 'ON PACE';
  if (ratio >= 0.5) return 'BEHIND';
  return 'FAR BEHIND';
}

export function computeTargetPace(
  series: readonly TimeSeriesPoint[],
  lab: Lab,
  targetH: number,
  todayIso: string,
  projEndIso: string,
  trailingWindowDays = 180,
): PaceResult {
  const empty: PaceResult = {
    lab,
    observedNow: 0,
    targetH,
    requiredPerQuarter: 0,
    trailingPerQuarter: 0,
    paceRatio: null,
    status: 'NO DATA',
    trailingWindowDays,
  };

  const past = series.filter((p) => p.date <= todayIso);
  if (past.length === 0) return empty;

  const nowPt = past[past.length - 1];
  const observedNow = nowPt[lab];
  if (!(observedNow > 0)) return empty;

  if (observedNow >= targetH) {
    return {
      ...empty,
      observedNow,
      status: 'MET',
    };
  }

  const todayMs = new Date(`${todayIso}T00:00:00`).getTime();
  const endMs = new Date(`${projEndIso}T00:00:00`).getTime();
  const remainingQuarters = Math.max((endMs - todayMs) / QUARTER_MS, 0.1);
  const requiredPerQuarter = (targetH - observedNow) / remainingQuarters;

  // Trailing pace: growth since the latest snapshot at-or-before the
  // window start, normalized per quarter. Falls back to the earliest
  // point when history is shorter than the window.
  const windowStartIso = new Date(todayMs - trailingWindowDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
  const before = past.filter((p) => p.date <= windowStartIso);
  const basePt = before.length > 0 ? before[before.length - 1] : past[0];
  const baseMs = new Date(`${basePt.date}T00:00:00`).getTime();
  const spanQuarters = Math.max((todayMs - baseMs) / QUARTER_MS, 0.25);
  const trailingPerQuarter = (observedNow - basePt[lab]) / spanQuarters;

  const paceRatio = trailingPerQuarter / requiredPerQuarter;

  return {
    lab,
    observedNow,
    targetH,
    requiredPerQuarter,
    trailingPerQuarter,
    paceRatio,
    status: statusFor(paceRatio),
    trailingWindowDays,
  };
}
