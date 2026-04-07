import type {
  ConfidenceResult,
  EpochDataCenter,
  EpochTimelineEvent,
  LabColorMap,
} from '@/types';

const PHASE_LABELS = [
  'Not Started',
  'Clearing',
  'Construction',
  'Equipment',
  'Operational',
  'Ramped',
] as const;

/**
 * Score a data center's construction progress from 0-100.
 *
 * Uses Epoch's timeline text signals ("roof complete", "chiller",
 * "substation connected", etc) to detect the construction phase, blends
 * that with power ramp progress and time-elapsed-vs-total-span, and emits
 * a composite score + label + color.
 *
 * Ported 1:1 from ai-arms-race.html — lodash `_.sortBy` replaced with
 * native `Array.prototype.sort`, and the colors lookup is now passed in
 * rather than reached from a global.
 */
export function scoreConfidence(
  _dc: EpochDataCenter,
  timeline: readonly EpochTimelineEvent[],
  today: string,
  colors: LabColorMap,
): ConfidenceResult {
  const sorted = [...timeline].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const past = sorted.filter((t) => t.date <= today);
  const future = sorted.filter((t) => t.date > today);
  const last = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const current = past.length > 0 ? past[past.length - 1] : null;

  // Detect construction phase from text signals.
  let phase = 0;
  const allText = sorted.map((t) => (t.st ?? '').toLowerCase()).join(' ');
  if (allText.includes('operational')) phase = Math.max(phase, 4);
  if (
    allText.includes('roof complete') ||
    allText.includes('chiller') ||
    allText.includes('generator')
  ) {
    phase = Math.max(phase, 3);
  }
  if (allText.includes('construction') || allText.includes('foundation')) {
    phase = Math.max(phase, 2);
  }
  if (allText.includes('land clearing')) phase = Math.max(phase, 1);
  if (current && current.p > 0) phase = Math.max(phase, 4);

  const currentPower = current ? current.p || 0 : 0;
  const maxPower = last ? last.p || 0 : 0;
  const powerPct = maxPower > 0 ? Math.min(1, currentPower / maxPower) : 0;

  const growing = future.length > 0 && maxPower > 0 && currentPower < maxPower * 0.85;
  if (currentPower > 0 && !growing && future.length === 0) phase = 5;

  const firstDate = sorted.length > 0 ? sorted[0].date : null;
  const finalDate = last ? last.date : null;

  if (!firstDate || !finalDate) {
    return {
      score: 0,
      phase,
      label: 'NO DATA',
      color: '#555',
      powerPct,
      currentPower,
      maxPower,
      description: 'No data',
      phaseLabel: 'Unknown',
      finalDate,
      category: 'PLN',
    };
  }

  const totalSpan = new Date(finalDate).getTime() - new Date(firstDate).getTime();
  const elapsed = new Date(today).getTime() - new Date(firstDate).getTime();
  const timePct = totalSpan > 0 ? Math.min(1, Math.max(0, elapsed / totalSpan)) : 0;
  const delta = powerPct - timePct;

  // Composite score.
  let score: number;
  if (phase >= 5) {
    score = 98;
  } else if (phase >= 4) {
    score = 70 + Math.round(powerPct * 25) + Math.max(0, Math.round(delta * 10));
  } else if (phase >= 2) {
    score = 40 + Math.round(timePct * 30) + phase * 5;
    if (past.length >= 3) score += 10;
  } else if (phase >= 1) {
    score = 15 + Math.round(timePct * 15);
  } else {
    score = 0;
  }

  // Penalty for delays.
  if (allText.includes('pause') || allText.includes('delay')) {
    score = Math.max(5, score - 15);
  }

  score = Math.max(0, Math.min(98, score));

  // Category: operational / building / planned.
  let category: 'OP' | 'BLD' | 'PLN';
  if (!growing && currentPower > 0) category = 'OP';
  else if (currentPower > 0 || phase >= 1) category = 'BLD';
  else category = 'PLN';

  // Live sites are done, not "on track".
  if (category === 'OP') score = 100;

  let label: string;
  let color: string;
  if (score === 100) {
    label = 'LIVE';
    color = colors.OpenAI;
  } else if (score >= 85) {
    label = 'ON TRACK';
    color = colors.OpenAI;
  } else if (score >= 65) {
    label = 'LIKELY';
    color = colors.Anthropic;
  } else if (score >= 40) {
    label = 'UNCERTAIN';
    color = '#ff8800';
  } else if (score >= 15) {
    label = 'EARLY';
    color = colors.Meta;
  } else if (score > 0) {
    label = 'MINIMAL';
    color = '#666';
  } else {
    label = 'NOT STARTED';
    color = '#444';
  }

  let desc = `${past.length} obs, ${future.length} proj. `;
  if (powerPct > 0) desc += `${Math.round(powerPct * 100)}% peak. `;
  if (phase === 0 && currentPower === 0) desc = 'No activity. ';
  desc += '±6mo/±1.4×.';

  return {
    score,
    phase,
    label,
    color,
    powerPct,
    currentPower,
    maxPower,
    description: desc,
    phaseLabel: PHASE_LABELS[Math.min(phase, 5)],
    finalDate,
    category,
  };
}
