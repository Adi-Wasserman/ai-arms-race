import { describe, expect, it } from 'vitest';

import { buildProjections2029 } from '@/services/projections';
import type { Lab, ProjectionTargetMap, TimeSeriesPoint, UncertaintyBand } from '@/types';

const LABS: readonly Lab[] = ['OpenAI', 'xAI'];

const TARGETS = {
  OpenAI: { h: 1000, p: 100, basis: 'test' },
  xAI: { h: 500, p: 50, basis: 'test' },
} as unknown as ProjectionTargetMap;

const NO_UNCERTAINTY: UncertaintyBand = { base: 0, perYear: 0 };

function anchorPoint(date: string): TimeSeriesPoint {
  const pt = { date, tH: 150, tP: 15 } as TimeSeriesPoint;
  pt.OpenAI = 100;
  pt.OpenAI_pw = 10;
  pt.xAI = 50;
  pt.xAI_pw = 5;
  // Unused labs default to undefined — the engine only reads the labs
  // it's given, so this fixture stays minimal.
  return pt;
}

describe('buildProjections2029', () => {
  it('returns empty bands for an empty series', () => {
    const out = buildProjections2029([], LABS, TARGETS, '2029-01-01', NO_UNCERTAINTY, '2026-06-09');
    expect(out).toEqual({ central: [], low: [], high: [] });
  });

  it('returns empty bands when the anchor is at or past projEnd', () => {
    const out = buildProjections2029(
      [anchorPoint('2029-06-01')],
      LABS,
      TARGETS,
      '2029-01-01',
      NO_UNCERTAINTY,
      '2029-06-09',
    );
    expect(out).toEqual({ central: [], low: [], high: [] });
  });

  it('reaches the per-lab targets exactly at projEnd', () => {
    const out = buildProjections2029(
      [anchorPoint('2026-06-01')],
      LABS,
      TARGETS,
      '2029-01-01',
      NO_UNCERTAINTY,
      '2026-06-09',
    );
    const final = out.central[out.central.length - 1];
    expect(final.date).toBe('2029-01-01');
    expect(final.OpenAI).toBe(1000);
    expect(final.xAI).toBe(500);
    expect(final.OpenAI_pw).toBe(100);
  });

  it('totals are the sum of the per-lab values at every point', () => {
    const out = buildProjections2029(
      [anchorPoint('2026-06-01')],
      LABS,
      TARGETS,
      '2029-01-01',
      NO_UNCERTAINTY,
      '2026-06-09',
    );
    for (const pt of out.central) {
      expect(pt.tH).toBe(pt.OpenAI + pt.xAI);
      expect(pt.tP).toBe(pt.OpenAI_pw + pt.xAI_pw);
    }
  });

  it('projection is monotonically non-decreasing (ease-out toward target)', () => {
    const out = buildProjections2029(
      [anchorPoint('2026-06-01')],
      LABS,
      TARGETS,
      '2029-01-01',
      NO_UNCERTAINTY,
      '2026-06-09',
    );
    for (let i = 1; i < out.central.length; i++) {
      expect(out.central[i].OpenAI).toBeGreaterThanOrEqual(out.central[i - 1].OpenAI);
    }
  });

  it('uncertainty widens the low/high bands over time', () => {
    const out = buildProjections2029(
      [anchorPoint('2026-06-01')],
      LABS,
      TARGETS,
      '2029-01-01',
      { base: 0.08, perYear: 0.06 },
      '2026-06-09',
    );
    const first = 0;
    const last = out.central.length - 1;
    const spreadFirst = out.high[first].tH - out.low[first].tH;
    const spreadLast = out.high[last].tH - out.low[last].tH;
    expect(spreadLast).toBeGreaterThan(spreadFirst);
    // Bands bracket the central estimate.
    for (let i = 0; i < out.central.length; i++) {
      expect(out.low[i].tH).toBeLessThanOrEqual(out.central[i].tH);
      expect(out.high[i].tH).toBeGreaterThanOrEqual(out.central[i].tH);
    }
  });

  it('holds flat when a target dips below the current value', () => {
    const lowTargets = {
      OpenAI: { h: 10, p: 1, basis: 'below current' },
      xAI: { h: 500, p: 50, basis: 'test' },
    } as unknown as ProjectionTargetMap;
    const out = buildProjections2029(
      [anchorPoint('2026-06-01')],
      LABS,
      lowTargets,
      '2029-01-01',
      NO_UNCERTAINTY,
      '2026-06-09',
    );
    for (const pt of out.central) {
      expect(pt.OpenAI).toBe(100); // never drops below the anchor value
    }
  });
});
