import { useMemo } from 'react';

import { LAB_COLORS } from '@/config/labs';
import { scoreConfidence } from '@/services/confidence';
import { useDashboard } from '@/store';

import styles from './FacilityCountLine.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

/**
 * Shared facility count line used by Geo Map and Intel sections.
 *
 *   X/Y · ● N Live · ◐ N Building · ○ N Planned
 *
 *   X = facilities currently visible (filtered by labFilter + statusFilter)
 *   Y = total tracked facilities (all non-Other DCs in the dataset)
 *
 * Reads from the shared `intelSlice.labFilter` / `statusFilter`, so both
 * sections always show the same numbers and stay in sync automatically.
 */
export function FacilityCountLine(): JSX.Element {
  const dataCenters = useDashboard((s) => s.dataCenters);
  const timeline = useDashboard((s) => s.timeline);
  const labFilter = useDashboard((s) => s.labFilter);
  const statusFilter = useDashboard((s) => s.statusFilter);
  const dataVersion = useDashboard((s) => s.dataVersion);

  const counts = useMemo(() => {
    const all = dataCenters.filter((d) => d.co !== 'Other');

    const enriched = all.map((dc) => {
      const tl = timeline.filter((t) => t.dc === dc.handle);
      return { dc, cf: scoreConfidence(dc, tl, TODAY_ISO, LAB_COLORS) };
    });

    const labFiltered =
      labFilter === 'ALL' ? enriched : enriched.filter((r) => r.dc.co === labFilter);

    const statusFiltered =
      statusFilter === 'ALL'
        ? labFiltered
        : labFiltered.filter((r) => r.cf.category === statusFilter);

    const op = enriched.filter((r) => r.cf.category === 'OP').length;
    const bld = enriched.filter((r) => r.cf.category === 'BLD').length;
    const pln = enriched.length - op - bld;

    return {
      total: enriched.length,
      shown: statusFiltered.length,
      op,
      bld,
      pln,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, labFilter, statusFilter, dataCenters, timeline]);

  return (
    <div className={styles.line}>
      <span>
        <span className={styles.shown}>{counts.shown}</span>
        <span>/{counts.total}</span>
      </span>
      <span className={styles.dot}>·</span>
      <span style={{ color: LAB_COLORS.OpenAI }}>● {counts.op} Live</span>
      <span className={styles.dot}>·</span>
      <span style={{ color: LAB_COLORS.Anthropic }}>◐ {counts.bld} Building</span>
      <span className={styles.dot}>·</span>
      <span style={{ color: '#666' }}>○ {counts.pln} Planned</span>
    </div>
  );
}
