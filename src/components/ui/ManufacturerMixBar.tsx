import type { ManufacturerSegment } from '@/services/ownershipMath';

import styles from './ManufacturerMixBar.module.css';

export interface ManufacturerMixBarProps {
  segments: readonly ManufacturerSegment[] | null;
  /** Visual height. Default 'tiny' (6px) for the leaderboard sidebar. */
  size?: 'tiny' | 'small';
  /** Tooltip text shown via native title on each segment. */
  showSegmentTitle?: boolean;
  className?: string;
}

/**
 * Compact horizontal stacked bar showing per-manufacturer chip share
 * (% Nvidia / % Google TPU / % AWS Trainium / % AMD / % Huawei).
 *
 * Renders nothing meaningful if `segments` is null/empty (e.g. when
 * `useEpochChipOwners` hasn't loaded yet, or when a lab has no
 * matching owner snapshot in the dataset). Caller decides whether
 * to show a placeholder.
 */
export function ManufacturerMixBar({
  segments,
  size = 'tiny',
  showSegmentTitle = false,
  className,
}: ManufacturerMixBarProps): JSX.Element {
  if (!segments || segments.length === 0) {
    return <span className={styles.empty}>—</span>;
  }
  return (
    <div
      className={`${styles.bar} ${styles[size]}${className ? ` ${className}` : ''}`}
    >
      {segments.map((seg) => (
        <div
          key={seg.manufacturer}
          className={styles.segment}
          style={{ width: `${seg.pct}%`, background: seg.color }}
          title={
            showSegmentTitle
              ? `${seg.manufacturer}: ${seg.pct.toFixed(0)}%`
              : undefined
          }
          aria-label={`${seg.manufacturer}: ${seg.pct.toFixed(0)}%`}
        />
      ))}
    </div>
  );
}
