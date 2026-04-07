/**
 * Offline reproduction of the browser failure — run parseEpochData
 * against the real Epoch CSVs downloaded to /tmp/{dc,tl}.csv and see
 * what throws.
 *
 * Usage:  npx tsx scripts/sanity-parseEpoch.ts
 */

import { readFileSync } from 'node:fs';

import Papa from 'papaparse';

import { LAB_NAMES } from '@/config/labs';
import { parseEpochData } from '@/services/epoch';
import { buildTimeSeries } from '@/services/timeseries';
import type { CsvRow } from '@/types';

const dcText = readFileSync('/tmp/dc.csv', 'utf8');
const tlText = readFileSync('/tmp/tl.csv', 'utf8');

const dcParsed = Papa.parse<CsvRow>(dcText, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true,
});
const tlParsed = Papa.parse<CsvRow>(tlText, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true,
});

console.log(`dc rows: ${dcParsed.data.length}, errors: ${dcParsed.errors.length}`);
console.log(`tl rows: ${tlParsed.data.length}, errors: ${tlParsed.errors.length}`);
if (dcParsed.errors.length > 0) console.log('dc errors:', dcParsed.errors.slice(0, 3));
if (tlParsed.errors.length > 0) console.log('tl errors:', tlParsed.errors.slice(0, 3));

console.log('\nfirst dc row keys:', Object.keys(dcParsed.data[0] ?? {}));
console.log('first tl row keys:', Object.keys(tlParsed.data[0] ?? {}));

console.log('\nrunning parseEpochData...');
try {
  const parsed = parseEpochData(dcParsed.data, tlParsed.data);
  console.log(`  OK: ${parsed.dataCenters.length} DCs, ${parsed.timeline.length} timeline, ${parsed.entries.length} entries`);

  console.log('\nrunning buildTimeSeries on entries...');
  const series = buildTimeSeries(parsed.entries, parsed.labMap, LAB_NAMES);
  console.log(`  OK: ${series.length} series points`);
} catch (err) {
  console.error('THREW:', err);
  if (err instanceof Error) console.error('stack:', err.stack);
  process.exit(1);
}
