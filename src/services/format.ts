/**
 * Pure display formatters — ported from the Data layer of ai-arms-race.html.
 * No DOM, no state, no React — just `value → string`.
 */

/** `1200000 → "1.2M"`, `45000 → "45K"`. */
export function formatH100(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
  return `${v}`;
}

/** `1200 → "1.20 GW"`, `340 → "340 MW"`. */
export function formatPower(v: number): string {
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)} GW`;
  return `${Math.round(v)} MW`;
}

/** Compact axis formatter — always MW or GW, no decimals except GW. */
export function formatAxis(v: number): string {
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}GW`;
  if (v > 0) return `${Math.round(v)}MW`;
  return '0';
}

/**
 * Strip the operator prefix from a facility title so it fits in map pins
 * and table cells. "Microsoft Fairwater Mount Pleasant Wisconsin" →
 * "Fairwater Mount Pleasant".
 */
export function shortName(title: string): string {
  return title
    .replace(
      /^(OpenAI[- ]?(Oracle )?|Microsoft |Meta |Google |Anthropic[- ]Amazon |xAI |Crusoe |Amazon )/i,
      '',
    )
    .split(',')[0]
    .split('(')[0]
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ');
}
