import { LAB_COLORS } from '@/config/labs';
import { useDashboard } from '@/store';
import type { Lab, LabFilter } from '@/types';

import styles from './LabLegend.module.css';

/**
 * Display order for the legend pills. Independent from `LAB_NAMES`
 * (which the charts + leaderboard rely on for stable indexing) so we
 * can reorder the legend without ripple effects elsewhere.
 */
const LAB_LEGEND_ORDER: readonly Lab[] = [
  'OpenAI',
  'Gemini',
  'Anthropic',
  'xAI',
  'Meta',
] as const;

export interface LabLegendProps {
  /** Optional uppercase label shown to the left of the pills. */
  label?: string;
  /** Show an explicit "ALL" pill at the start of the row. */
  showAll?: boolean;
}

/**
 * Shared lab legend / filter pill row used by the Geo Map and Intel
 * sections. Reads `labFilter` from `intelSlice` so both sections
 * automatically stay in sync without any prop drilling — clicking a
 * pill in one section updates the other instantly.
 *
 * Each pill has a colored dot matching the lab's pin/line color across
 * the dashboard. Clicking the active lab clears back to "ALL".
 */
export function LabLegend({
  label = 'LAB',
  showAll = true,
}: LabLegendProps): JSX.Element {
  const labFilter = useDashboard((s) => s.labFilter);
  const setLabFilter = useDashboard((s) => s.setLabFilter);

  const handleClick = (lab: LabFilter): void => {
    // Toggling the active lab clears the filter back to ALL.
    setLabFilter(labFilter === lab ? 'ALL' : lab);
  };

  return (
    <div className={styles.legend}>
      {label && <span className={styles.label}>{label}</span>}

      {showAll && (
        <button
          type="button"
          className={`${styles.item}${labFilter === 'ALL' ? ` ${styles.active}` : ''}`}
          onClick={() => setLabFilter('ALL')}
          title="Show all labs"
        >
          ALL
        </button>
      )}

      {LAB_LEGEND_ORDER.map((lab) => {
        const active = labFilter === lab;
        const dim = labFilter !== 'ALL' && !active;
        return (
          <button
            key={lab}
            type="button"
            className={`${styles.item}${active ? ` ${styles.active}` : ''}${dim ? ` ${styles.dim}` : ''}`}
            onClick={() => handleClick(lab)}
            title={`Filter to ${lab}${active ? ' (click to clear)' : ''}`}
          >
            <span
              className={styles.dot}
              style={{ background: LAB_COLORS[lab] }}
            />
            {lab}
          </button>
        );
      })}
    </div>
  );
}
