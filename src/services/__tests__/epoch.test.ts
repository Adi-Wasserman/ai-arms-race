import { describe, expect, it, vi } from 'vitest';

import { col, dmsToDecimal, parseEpochData } from '@/services/epoch';

describe('parseEpochData', () => {
  const dcRows = [
    {
      // Current Epoch schema uses "Name" (legacy exports used "Handle").
      Name: 'Stargate Abilene',
      Users: 'OpenAI #confident',
      Owner: 'Crusoe/Oracle',
      'Current H100 equivalents': 450000,
      'Current power (MW)': 300,
    },
    {
      Name: 'Colossus 2',
      Users: 'Anthropic, Cursor #confident',
      Owner: 'SpaceXAI',
      'Current H100 equivalents': 550000,
      'Current power (MW)': 561,
    },
  ];
  const tlRows = [
    { Date: '2025-06-01', 'Data center': 'Stargate Abilene', 'H100 equivalents': 100000, 'Power (MW)': 80 },
    { Date: '2026-01-01', 'Data center': 'Colossus 2', 'H100 equivalents': 550000, 'Power (MW)': 561 },
  ];

  it('parses facilities via the "Name" column (post-2026 Epoch schema)', () => {
    const out = parseEpochData(dcRows, tlRows);
    expect(out.dataCenters).toHaveLength(2);
    expect(out.dataCenters[0].handle).toBe('Stargate Abilene');
    expect(out.dataCenters[0].h).toBe(450000);
  });

  it('classifies SpaceXAI-owned Colossus as xAI despite tenant users', () => {
    const out = parseEpochData(dcRows, tlRows);
    expect(out.labMap['Colossus 2']).toBe('xAI');
  });

  it('always seeds the cloud-lease and Colossus tenant handles', () => {
    const out = parseEpochData(dcRows, tlRows);
    expect(out.labMap['EAI-AWS']).toBe('Anthropic');
    expect(out.labMap['COL-ANT']).toBe('Anthropic');
    expect(out.labMap['COL-GGL']).toBe('Gemini');
    expect(out.labMap['COL-XAI-ADJ']).toBe('xAI');
  });

  it('builds timeline entries via the "Data center" column', () => {
    const out = parseEpochData(dcRows, tlRows);
    expect(out.entries).toHaveLength(2);
    expect(out.entries[0]).toMatchObject({ dc: 'Stargate Abilene', h: 100000, p: 80 });
  });

  it('returns empty entries (the fallback trigger) when the timeline is empty', () => {
    const out = parseEpochData(dcRows, []);
    expect(out.entries).toHaveLength(0);
    expect(out.timeline).toHaveLength(0);
  });

  it('coerces non-numeric values to 0 and warns about schema drift', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = parseEpochData(
      [
        {
          Name: 'Broken Row',
          Users: 'OpenAI',
          Owner: '',
          'Current H100 equivalents': 'N/A',
          'Current power (MW)': 100,
        },
      ],
      [],
    );
    expect(out.dataCenters[0].h).toBe(0);
    expect(out.dataCenters[0].pw).toBe(100);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('schema drift'));
    warn.mockRestore();
  });
});

describe('col', () => {
  it('matches exact column names first', () => {
    expect(col({ Handle: 'X' }, ['Handle', 'Name'])).toBe('X');
  });

  it('falls back to fuzzy substring matching for renamed columns', () => {
    // "Current power (MW)" contains the candidate "Power (MW)".
    expect(col({ 'Current power (MW)': 42 }, ['Power (MW)'])).toBe(42);
  });

  it('returns the fallback when nothing matches', () => {
    expect(col({ Foo: 1 }, ['Bar'], 'fb')).toBe('fb');
    expect(col({ Foo: 1 }, ['Bar'])).toBeNull();
  });
});

describe('dmsToDecimal', () => {
  it('passes numbers through', () => {
    expect(dmsToDecimal(32.5)).toBe(32.5);
  });

  it('converts DMS strings to decimal degrees', () => {
    expect(dmsToDecimal('32°30\'00"N')).toBeCloseTo(32.5, 5);
  });

  it('negates south and west directions', () => {
    expect(dmsToDecimal('97°15\'00"W')).toBeCloseTo(-97.25, 5);
  });

  it('parses plain decimal strings', () => {
    expect(dmsToDecimal('45.125')).toBeCloseTo(45.125, 5);
  });

  it('returns null for garbage', () => {
    expect(dmsToDecimal('not a coordinate')).toBeNull();
    expect(dmsToDecimal(null)).toBeNull();
  });
});
