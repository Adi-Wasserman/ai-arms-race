import { describe, expect, it } from 'vitest';

import { buildTimeSeries } from '@/services/timeseries';
import type { EpochDataEntry, Lab, LabMap } from '@/types';

const LABS: readonly Lab[] = ['OpenAI', 'Gemini', 'Meta', 'xAI', 'Anthropic'];

const LAB_MAP: LabMap = {
  'Stargate Abilene': 'OpenAI',
  'Colossus 2': 'xAI',
  'Rando DC': 'Other',
};

describe('buildTimeSeries', () => {
  it('produces one cumulative snapshot per unique date', () => {
    const entries: EpochDataEntry[] = [
      { date: '2025-01-01', dc: 'Stargate Abilene', h: 100, p: 10 },
      { date: '2025-02-01', dc: 'Colossus 2', h: 200, p: 20 },
      { date: '2025-03-01', dc: 'Stargate Abilene', h: 150, p: 15 },
    ];
    const series = buildTimeSeries(entries, LAB_MAP, LABS);

    expect(series.map((s) => s.date)).toEqual(['2025-01-01', '2025-02-01', '2025-03-01']);

    // Each facility contributes its MOST RECENT value (snapshot semantics,
    // not additive): Stargate's March row replaces its January row.
    expect(series[2].OpenAI).toBe(150);
    expect(series[2].xAI).toBe(200);
    expect(series[2].tH).toBe(350);
    expect(series[2].tP).toBe(35);
  });

  it('carries forward facilities with no new observation', () => {
    const entries: EpochDataEntry[] = [
      { date: '2025-01-01', dc: 'Stargate Abilene', h: 100, p: 10 },
      { date: '2025-06-01', dc: 'Colossus 2', h: 50, p: 5 },
    ];
    const series = buildTimeSeries(entries, LAB_MAP, LABS);
    // June snapshot still includes Stargate's January value.
    expect(series[1].OpenAI).toBe(100);
    expect(series[1].tH).toBe(150);
  });

  it('excludes facilities classified as Other from lab totals', () => {
    const entries: EpochDataEntry[] = [
      { date: '2025-01-01', dc: 'Rando DC', h: 999, p: 99 },
      { date: '2025-01-01', dc: 'Stargate Abilene', h: 100, p: 10 },
    ];
    const series = buildTimeSeries(entries, LAB_MAP, LABS);
    expect(series[0].tH).toBe(100);
    expect(series[0].tP).toBe(10);
  });

  it('returns an empty array for empty input', () => {
    expect(buildTimeSeries([], LAB_MAP, LABS)).toEqual([]);
  });
});
