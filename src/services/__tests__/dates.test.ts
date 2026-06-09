import { describe, expect, it } from 'vitest';

import { localTodayIso } from '@/services/dates';

describe('localTodayIso', () => {
  it('returns YYYY-MM-DD', () => {
    expect(localTodayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses the LOCAL calendar date, not UTC', () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    expect(localTodayIso()).toBe(expected);
  });
});
