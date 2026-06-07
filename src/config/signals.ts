import type { ConstructionSignal } from '@/types';

/**
 * Construction signals extracted from Epoch AI's satellite observation text.
 * Each signal is physical evidence from imagery; together they tell the
 * buildout progression story for a facility.
 *
 * Buildout progression:
 *   land clearing → foundation → 🏗️ roof → ⚡ generators → 🗼 cooling → 🔌 substation → operational
 */
export const CONSTRUCTION_SIGNALS: readonly ConstructionSignal[] = [
  {
    key: 'cooling',
    icon: '🗼',
    category: 'COOLING',
    meaning: 'Cooling towers visible',
    significance: 'Each tower ≈ 30MW of cooling capacity. Count × 30 = power estimate. Key power indicator.',
    polarity: '+',
  },
  {
    key: 'chillers',
    icon: '❄️',
    category: 'CHILLERS',
    meaning: 'Air-cooled chiller units',
    significance: 'Alternative cooling method; used in drier climates or liquid-cooling setups. Power estimated via cooling model.',
    polarity: '+',
  },
  {
    key: 'roof',
    icon: '🏗️',
    category: 'ROOF',
    meaning: 'Building roof complete',
    significance: 'Enclosure complete. ~5-7 months to operational.',
    polarity: '+',
  },
  {
    key: 'generators',
    icon: '⚡',
    category: 'GENERATORS',
    meaning: 'Backup generators installed',
    significance: 'Backup power ready; site is nearing power-on.',
    polarity: '+',
  },
  {
    key: 'substation',
    icon: '🔌',
    category: 'SUBSTATION',
    meaning: 'Grid substation connected',
    significance: 'Power is flowing. Strongest signal a site is near-operational.',
    polarity: '+',
  },
  {
    key: 'turbines',
    icon: '🔥',
    category: 'TURBINES',
    meaning: 'Gas turbines on-site',
    significance: 'Dedicated on-site power generation.',
    polarity: '+',
  },
  {
    key: 'permit',
    icon: '📋',
    category: 'PERMIT',
    meaning: 'Construction permit filed',
    significance: 'Official building permit on public record. Early positive signal for planned sites.',
    polarity: '+',
  },
  {
    key: 'liquid_cooling',
    icon: '💧',
    category: 'LIQUID COOLING',
    meaning: 'Liquid or direct-to-chip cooling',
    significance: 'Enables higher rack density (>50kW/rack). Indicates next-gen GPU deployment (Blackwell/Rubin).',
    polarity: '+',
  },
  {
    key: 'ppa',
    icon: '📄',
    category: 'PPA',
    meaning: 'Power purchase agreement signed',
    significance: 'Long-term power secured. Removes the key constraint for GW-scale facilities.',
    polarity: '+',
  },
  {
    key: 'delay',
    icon: '⚠️',
    category: 'DELAY',
    meaning: 'Delay or pause noted',
    significance: 'Timeline risk flag.',
    polarity: '-',
  },
] as const;
