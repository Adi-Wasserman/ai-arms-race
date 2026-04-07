/**
 * Generic export helpers shared by every feature section.
 *
 * Section-specific builders (exportRaceCSV, exportIntelCSV, …) live in
 * their feature folders and call into these primitives.
 *
 * Ported from the Export module in ai-arms-race.html.
 */

export type CsvCell = string | number | boolean | null | undefined;
export type CsvRecord = Record<string, CsvCell>;

/**
 * Serialize rows to a CSV string. Quotes any cell containing commas,
 * quotes, or newlines and escapes embedded quotes.
 *
 * @param rows    the data rows
 * @param columns optional explicit column order; defaults to `Object.keys(rows[0])`
 */
export function exportCSV(rows: readonly CsvRecord[], columns?: readonly string[]): string {
  if (rows.length === 0) return '';
  const cols = columns ?? Object.keys(rows[0]);
  const lines: string[] = [cols.join(',')];

  for (const row of rows) {
    const line = cols
      .map((c) => {
        const v = row[c];
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') {
          if (v.includes(',') || v.includes('"') || v.includes('\n')) {
            return `"${v.replace(/"/g, '""')}"`;
          }
          return v;
        }
        return String(v);
      })
      .join(',');
    lines.push(line);
  }

  return lines.join('\n');
}

/** Serialize any JSON-compatible value to a pretty-printed string. */
export function exportJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Trigger a browser download of a Blob. Creates a temporary anchor,
 * clicks it, and revokes the object URL on a short timeout.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Convenience: build a CSV string from rows and download it. */
export function downloadCSV(
  rows: readonly CsvRecord[],
  filename: string,
  columns?: readonly string[],
): void {
  const csv = exportCSV(rows, columns);
  downloadBlob(new Blob([csv], { type: 'text/csv' }), filename);
}

/** Convenience: serialize JSON and download it. */
export function downloadJSON(data: unknown, filename: string): void {
  const json = exportJSON(data);
  downloadBlob(new Blob([json], { type: 'application/json' }), filename);
}
