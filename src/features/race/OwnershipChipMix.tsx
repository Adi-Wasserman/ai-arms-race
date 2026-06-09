import { createPortal } from 'react-dom';

import { formatH100 } from '@/services/format';
import type { ChipManufacturer } from '@/types';

import { MFR_COLORS, type ChipMixSegment } from './ownershipTableData';
import styles from './OwnershipTable.module.css';

/* ─────────────────────────────────────────────────────────────
   Chip-mix cell + hover popover for the OwnershipTable.

   A single hovered-segment state lives in the parent; rendering
   happens via a React Portal so the popover escapes the table's
   `overflow-x: auto` clipping (which was why the native HTML
   `title` attribute was unreliable here).
   ───────────────────────────────────────────────────────────── */

export interface HoveredSegment {
  chipType: string;
  manufacturer: string;
  h100e: number;
  pct: number;
  color: string;
  /** Center-x of the anchor segment in viewport coordinates. */
  anchorX: number;
  /** Top-y of the anchor segment in viewport coordinates. */
  anchorY: number;
  /** Owner name (for the popover header). */
  owner: string;
}

export function ChipMixTooltip({
  segment,
}: {
  segment: HoveredSegment;
}): JSX.Element {
  return createPortal(
    <div
      className={styles.tooltip}
      style={{
        left: segment.anchorX,
        top: segment.anchorY,
      }}
    >
      <div className={styles.tooltipHeader}>
        <span
          className={styles.tooltipDot}
          style={{ background: segment.color }}
        />
        <span className={styles.tooltipChip}>{segment.chipType}</span>
      </div>
      <div className={styles.tooltipMeta}>
        <span className={styles.tooltipMetaLabel}>{segment.owner}</span>
        {' · '}
        <span>{segment.manufacturer}</span>
      </div>
      <div className={styles.tooltipBody}>
        <div>
          <span className={styles.tooltipBodyLabel}>H100e</span>
          <span className={styles.tooltipBodyValue}>
            {formatH100(segment.h100e)}
          </span>
        </div>
        <div>
          <span className={styles.tooltipBodyLabel}>Share</span>
          <span className={styles.tooltipBodyValue}>
            {segment.pct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ChipMixCell({
  segments,
  ownerName,
  scalePct,
  hovered,
  setHovered,
}: {
  segments: ChipMixSegment[];
  ownerName: string;
  /** Bar width as a percentage of the cell (0–100), relative to the largest owner. */
  scalePct: number;
  hovered: HoveredSegment | null;
  setHovered: (s: HoveredSegment | null) => void;
}): JSX.Element {
  if (segments.length === 0) {
    return <span style={{ color: 'var(--color-text-quaternary)' }}>—</span>;
  }
  // Sort segments by share descending so the legend matches the
  // visual prominence of the bar (biggest slice first).
  const sorted = [...segments].sort((a, b) => b.pct - a.pct);

  // Manufacturer rollup — sums per-chip percentages by manufacturer.
  // Always-visible at the top of the cell so the user has a quick
  // "Nvidia X% · Google Y%" summary without reading the chip-type list.
  const byMfr = new Map<string, number>();
  for (const seg of sorted) {
    byMfr.set(seg.manufacturer, (byMfr.get(seg.manufacturer) ?? 0) + seg.pct);
  }
  const mfrEntries = Array.from(byMfr.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className={styles.chipMix}>
      {/* ─── Stacked bar — one segment per chip type ─── */}
      <div className={styles.chipMixBar} style={{ width: `${scalePct}%` }}>
        {sorted.map((seg, i) => {
          const isHovered =
            hovered != null &&
            hovered.owner === ownerName &&
            hovered.chipType === seg.chipType;
          return (
            <div
              key={`${seg.chipType}-${i}`}
              className={`${styles.chipMixSegment}${isHovered ? ` ${styles.chipMixSegmentActive}` : ''}`}
              style={{ width: `${seg.pct}%`, background: seg.color }}
              aria-label={`${seg.chipType}: ${seg.pct.toFixed(1)}%`}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHovered({
                  chipType: seg.chipType,
                  manufacturer: seg.manufacturer,
                  h100e: seg.h100e,
                  pct: seg.pct,
                  color: seg.color,
                  anchorX: rect.left + rect.width / 2,
                  anchorY: rect.top,
                  owner: ownerName,
                });
              }}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>

      {/* ─── Manufacturer rollup (always visible) ─── */}
      <div className={styles.chipMixMfrRollup}>
        {mfrEntries.map(([mfr, pct], i) => (
          <span key={mfr}>
            {i > 0 && <span className={styles.chipMixMfrSep}> · </span>}
            <span
              className={styles.chipMixMfrName}
              style={{
                color:
                  MFR_COLORS[mfr as ChipManufacturer] ?? MFR_COLORS.Unknown,
              }}
            >
              {mfr}
            </span>{' '}
            <span className={styles.chipMixMfrPct}>{pct.toFixed(0)}%</span>
          </span>
        ))}
      </div>

      {/* ─── Per-chip-type legend — full breakdown, no hover required ─── */}
      <div className={styles.chipMixLegend}>
        {sorted.map((seg) => (
          <span key={seg.chipType} className={styles.chipMixLegendItem}>
            <span
              className={styles.chipMixLegendDot}
              style={{ background: seg.color }}
            />
            <span className={styles.chipMixLegendType}>{seg.chipType}</span>
            <span className={styles.chipMixLegendPct}>
              {seg.pct < 1 ? '<1%' : `${seg.pct.toFixed(0)}%`}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
