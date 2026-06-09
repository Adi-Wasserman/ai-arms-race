import { describe, expect, it } from 'vitest';

import { FLEET_ESTIMATES } from '@/data/fleet';

/**
 * The Colossus tenant split must stay net-zero: capacity rented to
 * Anthropic (COL-ANT) and Google (COL-GGL) is already inside xAI's
 * satellite total, so COL-XAI-ADJ must subtract exactly what the
 * tenant legs add. If this drifts, xAI's lab total is silently wrong
 * while the industry total still looks fine. (Mirrors the dev-time
 * validateColossusBalance() warning in fleet.ts.)
 */
function latestAtOrBefore(handle: string, date: string, idx: 2 | 3): number {
  let best = 0;
  let bestDate = '';
  for (const entry of FLEET_ESTIMATES) {
    if (entry[1] === handle && entry[0] <= date && entry[0] > bestDate) {
      best = entry[idx];
      bestDate = entry[0];
    }
  }
  return best;
}

describe('Colossus tenant split (COL-ANT / COL-GGL / COL-XAI-ADJ)', () => {
  const adjEntries = FLEET_ESTIMATES.filter((e) => e[1] === 'COL-XAI-ADJ');

  it('has at least one balancing entry', () => {
    expect(adjEntries.length).toBeGreaterThan(0);
  });

  it.each(adjEntries.map((e) => [e[0]] as const))(
    'H100e nets to zero at %s',
    (date) => {
      const rented =
        latestAtOrBefore('COL-ANT', date, 2) + latestAtOrBefore('COL-GGL', date, 2);
      const adj = latestAtOrBefore('COL-XAI-ADJ', date, 2);
      expect(rented + adj).toBe(0);
    },
  );

  it.each(adjEntries.map((e) => [e[0]] as const))(
    'power nets to zero at %s',
    (date) => {
      const rented =
        latestAtOrBefore('COL-ANT', date, 3) + latestAtOrBefore('COL-GGL', date, 3);
      const adj = latestAtOrBefore('COL-XAI-ADJ', date, 3);
      expect(rented + adj).toBe(0);
    },
  );

  it('every adjustment entry is negative', () => {
    for (const e of adjEntries) {
      expect(e[2]).toBeLessThan(0);
      expect(e[3]).toBeLessThan(0);
    }
  });
});

describe('FLEET_ESTIMATES shape', () => {
  it('all entries have ISO dates and finite numbers', () => {
    for (const [date, handle, h100e, powerMw] of FLEET_ESTIMATES) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(handle.length).toBeGreaterThan(0);
      expect(Number.isFinite(h100e)).toBe(true);
      expect(Number.isFinite(powerMw)).toBe(true);
    }
  });

  it('non-adjustment legs are strictly positive', () => {
    for (const [, handle, h100e] of FLEET_ESTIMATES) {
      if (handle !== 'COL-XAI-ADJ') expect(h100e).toBeGreaterThan(0);
    }
  });
});
