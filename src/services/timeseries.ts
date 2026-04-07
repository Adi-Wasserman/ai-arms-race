import type {
  EpochDataEntry,
  Lab,
  LabMap,
  LeadChange,
  TimeSeriesPoint,
} from '@/types';

/**
 * Build cumulative time-series snapshots grouped by lab.
 *
 * Takes a flat list of entries (one per facility × observation date), the
 * handle→lab map, and the list of tracked labs. Returns one cumulative
 * snapshot per unique date: each facility contributes its *most recent*
 * h100e + power values to its parent lab, and the totals (`tH`, `tP`) are
 * the sums across all tracked labs.
 *
 * Ported 1:1 from ai-arms-race.html — lodash replaced with native sort /
 * Set / plain object group-by.
 */
export function buildTimeSeries(
  entries: readonly EpochDataEntry[],
  labMap: LabMap,
  labs: readonly Lab[],
): TimeSeriesPoint[] {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const snapH: Record<string, number> = {};
  const snapP: Record<string, number> = {};

  const dates = Array.from(new Set(sorted.map((e) => e.date))).sort();

  const byDate = new Map<string, EpochDataEntry[]>();
  for (const e of sorted) {
    const bucket = byDate.get(e.date);
    if (bucket) bucket.push(e);
    else byDate.set(e.date, [e]);
  }

  return dates.map((d) => {
    for (const e of byDate.get(d) ?? []) {
      snapH[e.dc] = e.h;
      snapP[e.dc] = e.p;
    }

    // Seed all lab fields to 0 so the shape satisfies TimeSeriesPoint.
    const pt = { date: d, tH: 0, tP: 0 } as TimeSeriesPoint;
    for (const lab of labs) {
      pt[lab] = 0;
      pt[`${lab}_pw`] = 0;
    }

    for (const dc of Object.keys(snapH)) {
      const lab = labMap[dc] ?? 'Other';
      if (lab === 'Other') continue;
      pt[lab] += snapH[dc] ?? 0;
      pt[`${lab}_pw`] += snapP[dc] ?? 0;
    }

    for (const lab of labs) {
      pt.tH += pt[lab];
      pt.tP += pt[`${lab}_pw`];
    }

    return pt;
  });
}

/**
 * Detect each time the #1 lab changes. Returns a list ordered by date.
 * `metric` selects between H100e and power.
 */
export function detectLeadChanges(
  series: readonly TimeSeriesPoint[],
  metric: 'h100e' | 'power',
  labs: readonly Lab[],
): LeadChange[] {
  const useH100 = metric === 'h100e';
  const changes: LeadChange[] = [];
  let prev: Lab | null = null;

  for (const pt of series) {
    let mx = 0;
    let leader: Lab | null = null;
    for (const lab of labs) {
      const v = useH100 ? pt[lab] : pt[`${lab}_pw`];
      if (v > mx) {
        mx = v;
        leader = lab;
      }
    }
    if (leader && leader !== prev && mx > 0) {
      changes.push({ date: pt.date, leader, value: mx, prev });
      prev = leader;
    }
  }

  return changes;
}
