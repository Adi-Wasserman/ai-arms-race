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
    key: 'delay',
    icon: '⚠️',
    category: 'DELAY',
    meaning: 'Delay or pause noted',
    significance: 'Timeline risk flag.',
    polarity: '-',
  },
] as const;
