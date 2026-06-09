import { useEffect, useMemo, useState } from 'react';

import { LAB_COLORS } from '@/config/labs';
import { useEpochChipOwners } from '@/hooks/useEpochChipOwners';
import { formatH100 } from '@/services/format';

import {
  type DerivedRow,
  deriveOwnershipRows,
  isMajorTenantLab,
  operatorIntegration,
} from './ownershipTableData';
import {
  ChipMixCell,
  ChipMixTooltip,
  type HoveredSegment,
} from './OwnershipChipMix';
import styles from './OwnershipTable.module.css';

const TOOLTIP_TEXT =
  'Ownership = who bought the chips. Access = who can use them (current view). Live from https://epoch.ai/data/ai_chip_owners.zip';

function ConfidenceBadge({
  conf,
}: {
  conf: DerivedRow['confidence'];
}): JSX.Element {
  const cls =
    conf === 'high'
      ? styles.confHigh
      : conf === 'medium'
        ? styles.confMed
        : conf === 'low'
          ? styles.confLow
          : styles.confUnknown;
  const label =
    conf === 'high'
      ? 'HIGH'
      : conf === 'medium'
        ? 'MED'
        : conf === 'low'
          ? 'LOW'
          : '—';
  return (
    <span
      className={`${styles.confBadge} ${cls}`}
      title="Confidence derived from Epoch's Monte Carlo 5th/95th percentile spread"
    >
      {label}
    </span>
  );
}

export function OwnershipTable(): JSX.Element {
  const { data, loading, error, lastUpdated, fromCache } =
    useEpochChipOwners();

  const rows = useMemo<DerivedRow[]>(
    () => (data ? deriveOwnershipRows(data) : []),
    [data],
  );

  const maxH100e = useMemo(
    () => rows.reduce((max, r) => Math.max(max, r.h100e), 1),
    [rows],
  );

  /**
   * Currently-hovered chip-mix segment. Tracks the segment + its
   * viewport coordinates so the popover can be portaled to the page
   * body and escape the table's `overflow-x: auto` clipping.
   */
  const [hovered, setHovered] = useState<HoveredSegment | null>(null);

  // Clear the popover when the user scrolls or resizes — segment
  // coordinates would otherwise be stale.
  useEffect(() => {
    if (!hovered) return;
    const dismiss = (): void => setHovered(null);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [hovered]);

  // ── Empty / loading / error states ──
  if (!data && loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.skeleton}>Loading Epoch chip owners…</div>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.errorMsg}>
          Failed to load chip ownership data: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.skeleton}>No ownership data available.</div>
      </div>
    );
  }

  // ── Banner state ──
  const bannerStatus =
    error && fromCache ? 'error' : fromCache ? 'stale' : 'ok';
  const bannerCls =
    bannerStatus === 'error'
      ? styles.error
      : bannerStatus === 'stale'
        ? styles.stale
        : '';
  const dotCls =
    bannerStatus === 'error'
      ? styles.error
      : bannerStatus === 'stale'
        ? styles.stale
        : '';
  const bannerLabel =
    bannerStatus === 'error'
      ? 'STALE / OFFLINE'
      : bannerStatus === 'stale'
        ? 'CACHED'
        : 'LIVE';

  return (
    <div className={styles.wrapper}>
      {/* ─── Metadata banner ─── */}
      <div className={`${styles.metaBar} ${bannerCls}`} title={TOOLTIP_TEXT}>
        <span className={`${styles.metaDot} ${dotCls}`} />
        <span>
          <span className={styles.metaLabel}>Hardware Ownership · </span>
          <span className={styles.metaValue}>{bannerLabel}</span>
        </span>
        <span>
          <span className={styles.metaLabel}>as of </span>
          <span className={styles.metaValue}>
            {data.asOf
              ? new Date(data.asOf + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </span>
        </span>
        <span>
          <span className={styles.metaLabel}>updated </span>
          <span className={styles.metaValue}>
            {lastUpdated
              ? new Date(lastUpdated).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </span>
        </span>
        <span>
          <span className={styles.metaLabel}>source </span>
          <a
            className={styles.metaLink}
            href="https://epoch.ai/data/ai_chip_owners.zip"
            target="_blank"
            rel="noreferrer"
            title={TOOLTIP_TEXT}
          >
            ai_chip_owners.zip
          </a>
        </span>
        {loading && (
          <span className={styles.metaUpdating}>UPDATING…</span>
        )}
      </div>

      {/* ─── Editorial lede ─── */}
      <div className={styles.lede}>
        <p className={styles.ledeText}>
          5 hyperscalers buy the chips — but only{' '}
          <strong>3 of 5 frontier labs</strong> actually operate them.
          The other 2 are tenants on shared infrastructure.
        </p>
        <div className={styles.ledePills}>
          <span className={`${styles.ledePill} ${styles.ledePillSelf}`}>
            SELF-OPERATED
          </span>
          <span className={styles.ledePillDesc}>
            Operator is the lab (Google, Meta, xAI)
          </span>
          <span className={`${styles.ledePill} ${styles.ledePillShared}`}>
            SHARED HOST
          </span>
          <span className={styles.ledePillDesc}>
            Lab rents capacity (OpenAI, Anthropic)
          </span>
        </div>
      </div>

      {/* ─── Table ─── */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} style={{ width: '14%' }}>OWNER / LAB</th>
            <th className={`${styles.th} ${styles.right}`} style={{ width: '8%' }}>H100e MEDIAN</th>
            <th className={`${styles.th} ${styles.right}`} style={{ width: '8%' }}>POWER</th>
            <th className={`${styles.th} ${styles.right}`} style={{ width: '8%' }}>% OF GLOBAL</th>
            <th className={`${styles.th} ${styles.chipMixTh}`} style={{ width: '26%' }}>CHIP MIX</th>
            <th className={`${styles.th} ${styles.right}`} style={{ width: '13%' }}>2029 TARGET</th>
            <th className={`${styles.th} ${styles.right}`} style={{ width: '7%' }}>CONF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const labColor = row.mappedLab ? LAB_COLORS[row.mappedLab] : '#888';
            // Rows whose lab is a Major Tenant get a subtle gray tint
            // via .rowMajorTenant so the structural relationship is
            // visible at a glance.
            const tenantRow = isMajorTenantLab(row.mappedLab);
            const integration = operatorIntegration(row.owner);
            return (
              <tr
                key={row.owner}
                className={`${styles.row}${tenantRow ? ` ${styles.rowMajorTenant}` : ''}`}
                style={{ '--row-color': labColor } as React.CSSProperties}
              >
                <td className={styles.td}>
                  <div className={styles.ownerName} style={{ color: labColor }}>
                    {row.owner}
                    {row.mappedLab && (
                      <span className={styles.ownerLab}>
                        → {row.mappedLab}
                      </span>
                    )}
                    {!row.mappedLab && (
                      <span className={styles.ownerSub}>(no lab attribution)</span>
                    )}
                  </div>
                  {integration && (
                    <span
                      className={`${styles.integrationPill} ${integration === 'self' ? styles.integrationSelf : styles.integrationShared}`}
                    >
                      {integration === 'self' ? 'SELF-OPERATED' : 'SHARED HOST'}
                    </span>
                  )}
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  <div className={styles.h100eMain} style={{ color: labColor }}>{formatH100(row.h100e)}</div>
                </td>
                <td className={`${styles.td} ${styles.right} ${styles.power}`} style={{ color: labColor }}>
                  {row.powerGw.toFixed(2)} GW
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  <div className={styles.pctGlobalCell}>
                    <span className={styles.pctGlobalValue}>
                      {row.pctGlobal.toFixed(1)}%
                    </span>
                    <div className={styles.pctGlobalBarTrack}>
                      <div
                        className={styles.pctGlobalBarFill}
                        style={{
                          width: `${row.pctGlobal}%`,
                          background: row.mappedLab ? labColor : '#666',
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className={`${styles.td} ${styles.chipMixTd}`}>
                  <ChipMixCell
                    segments={row.chipMix}
                    ownerName={row.owner}
                    scalePct={Math.max(8, (row.h100e / maxH100e) * 100)}
                    hovered={hovered}
                    setHovered={setHovered}
                  />
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  {row.proj2029 != null ? (
                    <>
                      <div className={styles.proj}>{formatH100(row.proj2029)}</div>
                      {row.proj2029Growth != null && (
                        <div className={styles.projGrowth}>
                          ~{Math.round(row.proj2029Growth)}× by Jan 2029
                        </div>
                      )}
                    </>
                  ) : (
                    <span className={styles.projMuted}>—</span>
                  )}
                </td>
                <td className={`${styles.td} ${styles.right}`}>
                  <ConfidenceBadge conf={row.confidence} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ─── Footer ───
          Two readable lines + one pointer to the Truth modal. The
          methodology footnote, override caveat, and technical
          caveats (confidence bands, projection logic, owner→lab
          attribution) all live in About this data → Truth modal. */}
      <div className={styles.footer}>
        <p className={styles.footerLead}>
          † <strong>H100e medians</strong> come directly from the Epoch AI
          Chip Owners ZIP (live). Owner → lab attribution is editorial:
          a hyperscaler's row covers ALL of its chips (cloud customers
          included), not just the mapped lab's slice.
        </p>
        <p className={styles.footerNote}>{TOOLTIP_TEXT}</p>
        <p className={styles.footerPointer}>
          Full methodology, override surface area, and uncertainty bands →
          click <strong>ⓘ ABOUT THIS DATA</strong> in the top status bar.
        </p>
      </div>

      {/* Hover popover — portaled to document.body so it escapes
          the table's overflow-x clipping. */}
      {hovered && <ChipMixTooltip segment={hovered} />}
    </div>
  );
}
