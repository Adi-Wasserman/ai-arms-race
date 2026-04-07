import type { EpochTimelineEvent, ObservationBadge } from '@/types';

/**
 * Extract construction-signal badges from the concatenated status text of
 * a facility's timeline entries. Each badge is one piece of physical
 * evidence (cooling towers, roof complete, substation connected, …) that
 * the UI renders as a pill.
 *
 * Ported 1:1 from ai-arms-race.html.
 */
export function extractObservations(
  timeline: readonly EpochTimelineEvent[],
): ObservationBadge[] {
  const obs: ObservationBadge[] = [];
  const allText = timeline.map((t) => (t.st ?? '').toLowerCase()).join(' ');

  const coolingMatch = allText.match(/(\d+)\s*cooling\s*tower/);
  if (coolingMatch) {
    obs.push({
      icon: '🗼',
      category: 'COOLING',
      value: `${coolingMatch[1]} towers`,
      meta: '~30MW/tower',
      signal: '+',
    });
  }

  const chillerMatch = allText.match(/(\d+)\s*(?:air[- ]cooled\s*)?chiller/);
  if (chillerMatch) {
    obs.push({
      icon: '❄️',
      category: 'CHILLERS',
      value: `${chillerMatch[1]} units`,
      meta: 'Power via cooling model',
      signal: '+',
    });
  }

  if (allText.includes('roof complete')) {
    obs.push({
      icon: '🏗️',
      category: 'ROOF',
      value: 'Complete',
      meta: '→ Live ~5-7mo',
      signal: '+',
    });
  }

  if (
    allText.includes('generator') &&
    (allText.includes('installed') || allText.includes('in place'))
  ) {
    obs.push({
      icon: '⚡',
      category: 'GENERATORS',
      value: 'Installed',
      meta: 'Backup ready',
      signal: '+',
    });
  }

  if (
    allText.includes('substation') &&
    (allText.includes('complete') || allText.includes('connected'))
  ) {
    obs.push({
      icon: '🔌',
      category: 'SUBSTATION',
      value: 'Connected',
      meta: 'Grid live',
      signal: '+',
    });
  }

  if (allText.includes('turbine') || allText.includes('natural gas')) {
    obs.push({
      icon: '🔥',
      category: 'TURBINES',
      value: 'On-site',
      meta: 'Dedicated power',
      signal: '+',
    });
  }

  if (allText.includes('pause') || allText.includes('delay')) {
    obs.push({
      icon: '⚠️',
      category: 'DELAY',
      value: 'Noted',
      meta: 'Timeline risk',
      signal: '-',
    });
  }

  return obs;
}
