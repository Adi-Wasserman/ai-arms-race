import { describe, expect, it } from 'vitest';

import { computeManufacturerMix, computeOwnedH100e, computePctOwned } from '@/services/ownershipMath';
import type { ChipTypeSnapshot, EpochChipOwnersData, OwnerSnapshot } from '@/types';

function makeSnapshot(
  owner: string,
  h100e: number,
  byChipType: ChipTypeSnapshot[] = [],
  range?: { low: number; high: number },
): OwnerSnapshot {
  return {
    owner,
    asOf: '2026-03-31',
    h100e,
    h100eLow: range?.low ?? h100e,
    h100eHigh: range?.high ?? h100e,
    units: 0,
    powerMw: 0,
    byChipType,
  };
}

function makeChipOwners(latestByOwner: OwnerSnapshot[]): EpochChipOwnersData {
  return {
    cumulativeByDesigner: [],
    quartersByChipType: [],
    cumulativeByChipType: [],
    latestByOwner,
    timeseries: [],
    owners: latestByOwner.map((s) => String(s.owner)),
    chipTypes: [],
    manufacturers: [],
    asOf: '2026-03-31',
    fetchedAt: '2026-06-09T00:00:00.000Z',
    zipBytes: 0,
  };
}

describe('computePctOwned', () => {
  it('OpenAI uses the 0% override (pure cloud tenant)', () => {
    const out = computePctOwned('OpenAI', 1_000_000, makeChipOwners([]));
    expect(out.pct).toBe(0);
    expect(out.isDerivedFromEpoch).toBe(false);
  });

  it('Anthropic uses the 25% transition override', () => {
    const out = computePctOwned('Anthropic', 1_000_000, makeChipOwners([]));
    expect(out.pct).toBe(25);
    expect(out.ownedH100e).toBe(250_000);
    expect(out.isDerivedFromEpoch).toBe(false);
  });

  it('derives xAI ownership from BOTH the xAI and SpaceXAI owner rows', () => {
    // Epoch renamed the owner xAI → SpaceXAI in 2026; config keeps both.
    const data = makeChipOwners([
      makeSnapshot('xAI', 100_000),
      makeSnapshot('SpaceXAI', 300_000),
    ]);
    const out = computePctOwned('xAI', 800_000, data);
    expect(out.ownedH100e).toBe(400_000);
    expect(out.pct).toBe(50);
    expect(out.isDerivedFromEpoch).toBe(true);
  });

  it('caps derived percentage at 100', () => {
    const data = makeChipOwners([makeSnapshot('Meta', 2_000_000)]);
    const out = computePctOwned('Meta', 1_000_000, data);
    expect(out.pct).toBe(100);
  });

  it('reports loading when chip owners are not yet available', () => {
    const out = computePctOwned('Meta', 1_000_000, null);
    expect(out.pct).toBe(0);
    expect(out.isDerivedFromEpoch).toBe(false);
    expect(out.footnote).toMatch(/loading/i);
  });

  it('handles a zero fleet denominator without NaN', () => {
    const data = makeChipOwners([makeSnapshot('Meta', 500_000)]);
    const out = computePctOwned('Meta', 0, data);
    expect(out.pct).toBe(0);
    expect(out.ownedH100e).toBe(500_000);
  });
});

describe('computeOwnedH100e', () => {
  it('never applies overrides — OpenAI/Anthropic report 0 by design', () => {
    const data = makeChipOwners([makeSnapshot('Microsoft', 1_000_000)]);
    expect(computeOwnedH100e('OpenAI', data).median).toBe(0);
    expect(computeOwnedH100e('Anthropic', data).median).toBe(0);
  });

  it('sums medians and Monte Carlo percentiles across selfOwned rows', () => {
    const data = makeChipOwners([
      makeSnapshot('xAI', 100_000, [], { low: 80_000, high: 130_000 }),
      makeSnapshot('SpaceXAI', 200_000, [], { low: 150_000, high: 260_000 }),
    ]);
    const out = computeOwnedH100e('xAI', data);
    expect(out.median).toBe(300_000);
    expect(out.low).toBe(230_000);
    expect(out.high).toBe(390_000);
    expect(out.sources).toEqual(['xAI', 'SpaceXAI']);
    expect(out.isDerivedFromEpoch).toBe(true);
  });
});

describe('computeManufacturerMix', () => {
  it('groups chip types by manufacturer with percentage shares', () => {
    const data = makeChipOwners([
      makeSnapshot('Google', 1_000, [
        { chipType: 'TPU v6e', manufacturer: 'Google', h100e: 600, units: 0, powerMw: 0 },
        { chipType: 'Ironwood', manufacturer: 'Google', h100e: 150, units: 0, powerMw: 0 },
        { chipType: 'H100', manufacturer: 'Nvidia', h100e: 250, units: 0, powerMw: 0 },
      ]),
    ]);
    const mix = computeManufacturerMix('Gemini', data);
    expect(mix).not.toBeNull();
    // Display order puts Nvidia first.
    expect(mix![0]).toMatchObject({ manufacturer: 'Nvidia', h100e: 250, pct: 25 });
    expect(mix![1]).toMatchObject({ manufacturer: 'Google', h100e: 750, pct: 75 });
  });

  it('assigns unknown future manufacturers the fallback color instead of dropping them', () => {
    const data = makeChipOwners([
      makeSnapshot('Google', 100, [
        { chipType: 'Quantum9000', manufacturer: 'NewCorp', h100e: 100, units: 0, powerMw: 0 },
      ]),
    ]);
    const mix = computeManufacturerMix('Gemini', data);
    expect(mix).toHaveLength(1);
    expect(mix![0].manufacturer).toBe('NewCorp');
  });

  it('returns null when data is missing or empty', () => {
    expect(computeManufacturerMix('Gemini', null)).toBeNull();
    expect(computeManufacturerMix('Gemini', makeChipOwners([]))).toBeNull();
    expect(
      computeManufacturerMix('Gemini', makeChipOwners([makeSnapshot('Google', 0)])),
    ).toBeNull();
  });
});
