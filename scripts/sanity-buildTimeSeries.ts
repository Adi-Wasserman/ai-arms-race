/**
 * Sanity check for services/timeseries.ts → buildTimeSeries.
 *
 * Runs against the hardcoded RAW_TIMELINE + LAB_MAP so it exercises the
 * full type chain (Epoch entries → cumulative snapshots → lab totals).
 *
 * Usage:  npx tsx scripts/sanity-buildTimeSeries.ts
 */

import { LAB_NAMES } from '@/config/labs';
import { LAB_MAP } from '@/data/facilities';
import { RAW_TIMELINE } from '@/data/timeline';
import { parseRawRows } from '@/services/epoch';
import { buildTimeSeries, detectLeadChanges } from '@/services/timeseries';

const entries = parseRawRows(RAW_TIMELINE);
const series = buildTimeSeries(entries, LAB_MAP, LAB_NAMES);

console.log(`entries:          ${entries.length}`);
console.log(`series points:    ${series.length}`);

const first = series[0];
const last = series[series.length - 1];

const fmt = (n: number): string =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${n}`;

console.log(`\nfirst snapshot   (${first.date}):`);
for (const lab of LAB_NAMES) {
  console.log(`  ${lab.padEnd(10)} ${fmt(first[lab]).padStart(8)} H100e  ${String(first[`${lab}_pw`]).padStart(5)} MW`);
}
console.log(`  TOTAL      ${fmt(first.tH).padStart(8)} H100e  ${first.tP} MW`);

console.log(`\nlatest snapshot  (${last.date}):`);
for (const lab of LAB_NAMES) {
  console.log(`  ${lab.padEnd(10)} ${fmt(last[lab]).padStart(8)} H100e  ${String(last[`${lab}_pw`]).padStart(5)} MW`);
}
console.log(`  TOTAL      ${fmt(last.tH).padStart(8)} H100e  ${last.tP} MW`);

const leadChanges = detectLeadChanges(series, 'h100e', LAB_NAMES);
console.log(`\nlead changes (H100e): ${leadChanges.length}`);
for (const c of leadChanges) {
  console.log(`  ${c.date}  ${c.prev ?? '(none)'.padEnd(9)} → ${c.leader.padEnd(9)}  @ ${fmt(c.value)}`);
}

// Sanity invariants
const monotonic = series.every((pt, i) => i === 0 || pt.date >= series[i - 1].date);
const totalsMatch = series.every((pt) => {
  const sumH = LAB_NAMES.reduce((s, l) => s + pt[l], 0);
  const sumP = LAB_NAMES.reduce((s, l) => s + pt[`${l}_pw`], 0);
  return sumH === pt.tH && sumP === pt.tP;
});

console.log(`\ninvariants:`);
console.log(`  dates monotonically increasing:  ${monotonic ? 'OK' : 'FAIL'}`);
console.log(`  tH / tP match per-lab sums:       ${totalsMatch ? 'OK' : 'FAIL'}`);

if (!monotonic || !totalsMatch) process.exit(1);
console.log(`\nbuildTimeSeries sanity check: OK`);
