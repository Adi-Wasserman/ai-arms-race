import { describe, expect, it } from 'vitest';

import { computeTargetPace } from '@/services/paceTracker';
import type { Lab, TimeSeriesPoint } from '@/types';

const LAB: Lab = 'OpenAI';
const TODAY = '2026-06-09';
const END = '2029-01-01';

function pt(date: string, value: number): TimeSeriesPoint {
  const p = { date, tH: value, tP: 0 } as TimeSeriesPoint;
  p[LAB] = value;
  p[`${LAB}_pw`] = 0;
  return p;
}

describe('computeTargetPace', () => {
  it('returns NO DATA for an empty series', () => {
    const out = computeTargetPace([], LAB, 1000, TODAY, END);
    expect(out.status).toBe('NO DATA');
  });

  it('returns MET when the observed value already exceeds the target', () => {
    const out = computeTargetPace([pt('2026-06-01', 1200)], LAB, 1000, TODAY, END);
    expect(out.status).toBe('MET');
  });

  it('reports ON PACE when trailing growth matches the required pace', () => {
    // Trailing window (~180d ≈ 2 quarters): +200/quarter.
    // Remaining to target: 2029-01-01 is ~10.4 quarters away;
    // target gap tuned so required ≈ trailing.
    const observedNow = 2000;
    const trailingPerQuarter = 200;
    const remainingQuarters = (new Date(`${END}T00:00:00`).getTime() -
      new Date(`${TODAY}T00:00:00`).getTime()) / (91.31 * 86_400_000);
    const target = Math.round(observedNow + trailingPerQuarter * remainingQuarters);
    const series = [
      pt('2025-12-09', observedNow - 2 * trailingPerQuarter),
      pt('2026-06-01', observedNow),
    ];
    const out = computeTargetPace(series, LAB, target, TODAY, END);
    expect(out.status).toBe('ON PACE');
    expect(out.paceRatio).toBeCloseTo(1, 1);
  });

  it('reports FAR BEHIND when growth has stalled', () => {
    const series = [pt('2025-12-09', 1000), pt('2026-06-01', 1010)];
    const out = computeTargetPace(series, LAB, 10_000, TODAY, END);
    expect(out.status).toBe('FAR BEHIND');
    expect(out.trailingPerQuarter).toBeLessThan(out.requiredPerQuarter);
  });

  it('reports AHEAD when trailing pace clearly exceeds the required pace', () => {
    // +500/qtr trailing, tiny remaining gap → ratio >> 1.15.
    const series = [pt('2025-12-09', 2000), pt('2026-06-01', 3000)];
    const out = computeTargetPace(series, LAB, 3500, TODAY, END);
    expect(out.status).toBe('AHEAD');
  });

  it('required pace is positive and finite for a normal gap', () => {
    const series = [pt('2026-06-01', 1000)];
    const out = computeTargetPace(series, LAB, 5000, TODAY, END);
    expect(out.requiredPerQuarter).toBeGreaterThan(0);
    expect(Number.isFinite(out.requiredPerQuarter)).toBe(true);
  });
});
