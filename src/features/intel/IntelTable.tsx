import { useMemo } from 'react';

import { LAB_COLORS } from '@/config/labs';
import { scoreConfidence } from '@/services/confidence';
import { formatH100, formatPower, shortName } from '@/services/format';
import { extractObservations } from '@/services/observations';
import { useDashboard } from '@/store';
import type {
  ConfidenceResult,
  EpochDataCenter,
  Lab,
  ObservationBadge,
  SortBy,
} from '@/types';

import styles from './IntelTable.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

interface ColDef {
  key: SortBy;
  label: string;
  width?: string;
  align?: 'left' | 'center';
}

const COLUMNS: readonly ColDef[] = [
  { key: 'rank', label: '#', width: '36px' },
  { key: 'status', label: 'STATUS', width: '60px', align: 'center' },
  { key: 'name', label: 'SITE' },
  { key: 'lab', label: 'LAB', width: '90px' },
  { key: 'conf', label: 'CONFIDENCE', width: '110px' },
  { key: 'power', label: 'POWER', width: '85px' },
  { key: 'peak', label: 'PEAK', width: '85px' },
  { key: 'h100e', label: 'H100e', width: '80px' },
  { key: 'cost', label: 'COST', width: '70px' },
  { key: 'obs', label: 'SIGNALS', width: '180px' },
];

interface Row {
  dc: EpochDataCenter;
  cf: ConfidenceResult;
  obs: readonly ObservationBadge[];
}

/**
 * Comparator factory matching the legacy table sort logic at HTML:2452-2464.
 * Lab + name use string compare; everything else is numeric.
 */
function compareRows(a: Row, b: Row, col: SortBy, dir: 'asc' | 'desc'): number {
  if (col === 'name') {
    const va = a.dc.title.toLowerCase();
    const vb = b.dc.title.toLowerCase();
    return dir === 'asc' ? (va < vb ? -1 : 1) : va > vb ? -1 : 1;
  }
  if (col === 'lab') {
    const va = a.dc.co;
    const vb = b.dc.co;
    return dir === 'asc' ? (va < vb ? -1 : 1) : va > vb ? -1 : 1;
  }
  let va = 0;
  let vb = 0;
  switch (col) {
    case 'conf':
    case 'rank':
      va = a.cf.score;
      vb = b.cf.score;
      break;
    case 'power':
      va = a.cf.currentPower;
      vb = b.cf.currentPower;
      break;
    case 'peak':
      va = a.cf.maxPower;
      vb = b.cf.maxPower;
      break;
    case 'h100e':
      va = a.dc.h;
      vb = b.dc.h;
      break;
    case 'cost':
      va = a.dc.cs;
      vb = b.dc.cs;
      break;
    case 'obs':
      va = a.obs.length;
      vb = b.obs.length;
      break;
    case 'status': {
      const order = { OP: 3, BLD: 2, PLN: 1 };
      va = order[a.cf.category];
      vb = order[b.cf.category];
      break;
    }
  }
  return dir === 'asc' ? va - vb : vb - va;
}

export function IntelTable(): JSX.Element {
  const dataCenters = useDashboard((s) => s.dataCenters);
  const timeline = useDashboard((s) => s.timeline);
  const labFilter = useDashboard((s) => s.labFilter);
  const statusFilter = useDashboard((s) => s.statusFilter);
  const sortBy = useDashboard((s) => s.sortBy);
  const sortDir = useDashboard((s) => s.sortDir);
  const expandedDC = useDashboard((s) => s.expandedDC);
  const setExpandedDC = useDashboard((s) => s.setExpandedDC);
  const toggleSort = useDashboard((s) => s.toggleSort);
  const dataVersion = useDashboard((s) => s.dataVersion);

  const rows: Row[] = useMemo(() => {
    const all = dataCenters.filter((d) => d.co !== 'Other');
    const labFiltered =
      labFilter === 'ALL' ? all : all.filter((d) => d.co === labFilter);

    const enriched: Row[] = labFiltered.map((dc) => {
      const tl = timeline.filter((t) => t.dc === dc.handle);
      const cf = scoreConfidence(dc, tl, TODAY_ISO, LAB_COLORS);
      const obs = extractObservations(tl);
      return { dc, cf, obs };
    });

    const statusFiltered =
      statusFilter === 'ALL'
        ? enriched
        : enriched.filter((r) => r.cf.category === statusFilter);

    return [...statusFiltered].sort((a, b) => compareRows(a, b, sortBy, sortDir));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, labFilter, statusFilter, sortBy, sortDir, dataCenters, timeline]);

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {COLUMNS.map((c) => {
              const sortCls =
                c.key === sortBy ? (sortDir === 'asc' ? styles.asc : styles.desc) : '';
              return (
                <th
                  key={c.key}
                  className={`${styles.th} ${sortCls}`}
                  style={{
                    width: c.width,
                    textAlign: c.align ?? 'left',
                  }}
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const { dc, cf, obs } = r;
            const lab = dc.co as Lab | 'Other';
            const labColor = lab === 'Other' ? '#555' : LAB_COLORS[lab];
            const isSelected = expandedDC === dc.handle;
            const statusIcon =
              cf.category === 'OP' ? '●' : cf.category === 'BLD' ? '◐' : '○';
            const statusColor = cf.category === 'PLN' ? '#555' : labColor;

            return (
              <tr
                key={dc.handle}
                className={`${styles.row}${isSelected ? ` ${styles.selected}` : ''}`}
                onClick={() => setExpandedDC(dc.handle)}
              >
                <td className={`${styles.td} ${styles.rk}`}>{i + 1}</td>
                <td className={`${styles.td} ${styles.statusCell}`}>
                  <span style={{ color: statusColor }}>{statusIcon}</span>
                </td>
                <td className={`${styles.td} ${styles.nm}`}>
                  <div className={styles.nmTitle}>{shortName(dc.title)}</div>
                  <div className={styles.nmSub}>
                    {dc.title.split(' ').slice(-2).join(', ')}
                  </div>
                </td>
                <td className={styles.td}>
                  <span style={{ color: labColor, fontWeight: 600, fontSize: 11 }}>
                    {dc.co}
                  </span>
                  {dc.conf && dc.conf !== 'unknown' && (
                    <span className={`${styles.confTag} ${styles[dc.conf]}`}>
                      {dc.conf.toUpperCase()}
                    </span>
                  )}
                </td>
                <td className={styles.td}>
                  <div className={styles.confCell}>
                    <span className={styles.confScore} style={{ color: cf.color }}>
                      {cf.score}
                    </span>
                    <div className={styles.confBarTrack}>
                      <div
                        className={styles.confBarFill}
                        style={{ width: `${cf.score}%`, background: cf.color }}
                      />
                    </div>
                    <span className={styles.confLabel} style={{ color: cf.color }}>
                      {cf.label}
                    </span>
                  </div>
                </td>
                <td className={`${styles.td} ${styles.mono}`}>
                  {cf.currentPower ? (
                    formatPower(cf.currentPower)
                  ) : (
                    <span className={styles.dim}>—</span>
                  )}
                </td>
                <td className={`${styles.td} ${styles.mono}`}>
                  {cf.maxPower ? (
                    formatPower(cf.maxPower)
                  ) : (
                    <span className={styles.dim}>—</span>
                  )}
                </td>
                <td className={`${styles.td} ${styles.mono}`}>
                  {dc.h ? formatH100(dc.h) : <span className={styles.dim}>—</span>}
                </td>
                <td className={`${styles.td} ${styles.mono}`}>
                  {dc.cs ? `$${dc.cs.toFixed(1)}B` : <span className={styles.dim}>—</span>}
                </td>
                <td className={styles.td}>
                  {obs.length === 0 ? (
                    <span className={styles.dim}>—</span>
                  ) : (
                    <div className={styles.obsBadges}>
                      {obs.map((o, oi) => (
                        <span
                          key={oi}
                          className={`${styles.obsBadge} ${
                            o.signal === '+' ? styles.pos : o.signal === '-' ? styles.neg : ''
                          }`}
                          title={o.meta}
                        >
                          {o.icon} {o.value}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
