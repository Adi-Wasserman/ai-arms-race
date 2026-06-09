import { describe, expect, it } from 'vitest';

import { scoreConfidence } from '@/services/confidence';
import type { EpochDataCenter, EpochTimelineEvent, LabColorMap } from '@/types';

const COLORS = {
  OpenAI: '#10a37f',
  Gemini: '#4285f4',
  Meta: '#0668e1',
  xAI: '#ffffff',
  Anthropic: '#d97757',
} as LabColorMap;

const DC = { handle: 'Test DC', title: 'Test DC', co: 'OpenAI' } as EpochDataCenter;

function ev(date: string, st: string, p = 0, h = 0): EpochTimelineEvent {
  return { date, dc: 'Test DC', st, h, p, buildings: 0 };
}

const TODAY = '2026-06-09';

describe('scoreConfidence', () => {
  it('returns NO DATA for an empty timeline', () => {
    const out = scoreConfidence(DC, [], TODAY, COLORS);
    expect(out.score).toBe(0);
    expect(out.label).toBe('NO DATA');
    expect(out.category).toBe('PLN');
  });

  it('scores a fully ramped site as LIVE with score 100', () => {
    const out = scoreConfidence(
      DC,
      [ev('2025-01-01', 'construction start'), ev('2026-01-01', 'operational', 300)],
      TODAY,
      COLORS,
    );
    expect(out.score).toBe(100);
    expect(out.label).toBe('LIVE');
    expect(out.category).toBe('OP');
    expect(out.powerPct).toBe(1);
  });

  it('treats a site still ramping toward future capacity as BUILDING', () => {
    const out = scoreConfidence(
      DC,
      [
        ev('2025-06-01', 'construction start'),
        ev('2026-01-01', 'first power', 100),
        ev('2027-06-01', 'full buildout', 1000),
      ],
      TODAY,
      COLORS,
    );
    expect(out.category).toBe('BLD');
    expect(out.score).toBeLessThan(100);
    expect(out.currentPower).toBe(100);
    expect(out.maxPower).toBe(1000);
  });

  it('classifies a future-only timeline as planned', () => {
    const out = scoreConfidence(
      DC,
      [ev('2027-01-01', 'construction start'), ev('2028-01-01', 'operational', 500)],
      TODAY,
      COLORS,
    );
    expect(out.category).not.toBe('OP');
    expect(out.currentPower).toBe(0);
  });

  it('applies a delay penalty', () => {
    const base = scoreConfidence(
      DC,
      [ev('2025-06-01', 'construction start'), ev('2027-01-01', 'target', 500)],
      TODAY,
      COLORS,
    );
    const delayed = scoreConfidence(
      DC,
      [ev('2025-06-01', 'construction start'), ev('2026-03-01', 'permitting delay'), ev('2027-01-01', 'target', 500)],
      TODAY,
      COLORS,
    );
    expect(delayed.score).toBeLessThan(base.score);
  });
});
