/**
 * One-off diagnostic for the Epoch AI Chip Owners ZIP.
 *
 * Fetches https://epoch.ai/data/ai_chip_owners.zip, lists every file
 * inside, and for each .csv inside the archive parses the first 5 rows
 * with PapaParse and dumps:
 *   - exact filename
 *   - all column headers
 *   - sample rows
 *
 * Usage:  npx tsx scripts/diagnose-epoch-chipowners.ts
 *
 * The output of this script is what we use to design `useEpochChipOwners`
 * — types, parser shape, name reconciliation against existing labs.
 */

import JSZip from 'jszip';
import Papa from 'papaparse';

const ZIP_URL = 'https://epoch.ai/data/ai_chip_owners.zip';

async function main(): Promise<void> {
  console.log(`[diagnose] fetching ${ZIP_URL}`);
  const res = await fetch(ZIP_URL);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  console.log(`[diagnose] HTTP ${res.status} · ${res.headers.get('content-type')}`);
  console.log(
    `[diagnose] last-modified: ${res.headers.get('last-modified') ?? '(none)'}`,
  );
  console.log(
    `[diagnose] content-length: ${res.headers.get('content-length') ?? '(none)'}`,
  );

  const buf = await res.arrayBuffer();
  console.log(`[diagnose] downloaded: ${buf.byteLength} bytes`);

  const zip = await JSZip.loadAsync(buf);

  const entries = Object.values(zip.files);
  console.log(`\n[diagnose] ZIP contents (${entries.length} entries):`);
  for (const entry of entries) {
    console.log(
      `  ${entry.dir ? '[DIR]' : '     '}  ${entry.name.padEnd(60)} ` +
        `${entry.dir ? '' : `${(entry as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? '?'} bytes`}`,
    );
  }

  // Parse every CSV.
  for (const entry of entries) {
    if (entry.dir) continue;
    if (!entry.name.toLowerCase().endsWith('.csv')) continue;

    console.log(`\n${'═'.repeat(76)}`);
    console.log(`[csv] ${entry.name}`);
    console.log('═'.repeat(76));

    const text = await entry.async('text');
    console.log(`size: ${text.length} chars`);

    // Parse with PapaParse, header mode + dynamic typing.
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parsed.errors.length > 0) {
      console.log(`parse errors: ${parsed.errors.length}`);
      console.log(parsed.errors.slice(0, 3));
    }

    const rows = parsed.data;
    console.log(`rows: ${rows.length}`);

    if (rows.length === 0) {
      console.log('(empty)');
      continue;
    }

    const cols = Object.keys(rows[0]);
    console.log(`columns (${cols.length}):`);
    for (const c of cols) console.log(`  · ${c}`);

    console.log(`\nfirst 5 rows:`);
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      console.log(`\n  row ${i}:`);
      for (const c of cols) {
        const v = rows[i][c];
        const display =
          v == null
            ? '(null)'
            : typeof v === 'string' && v.length > 80
              ? `${v.slice(0, 77)}...`
              : String(v);
        console.log(`    ${c.padEnd(30)} ${display}`);
      }
    }

    // Distinct values for likely key columns — helps spot the lab/owner vocabulary.
    const keyHints = ['owner', 'designer', 'operator', 'lab', 'company', 'chip', 'chip_type', 'family', 'name'];
    for (const col of cols) {
      if (!keyHints.some((h) => col.toLowerCase().includes(h))) continue;
      const distinct = new Set<string>();
      for (const r of rows) {
        const v = r[col];
        if (v != null) distinct.add(String(v));
      }
      console.log(`\n  distinct ${col} values (${distinct.size}):`);
      for (const v of Array.from(distinct).slice(0, 30)) {
        console.log(`    · ${v}`);
      }
      if (distinct.size > 30) console.log(`    … and ${distinct.size - 30} more`);
    }
  }

  console.log(`\n${'═'.repeat(76)}`);
  console.log('[diagnose] complete');
}

main().catch((err: unknown) => {
  console.error('[diagnose] failed:', err);
  process.exit(1);
});
