import { useEffect, useMemo } from 'react';

import { LAB_CHIPS, LAB_COLORS } from '@/config/labs';
import { FACILITY_COORD_OVERRIDES, FACILITY_COORDS } from '@/data/facilities';
import { scoreConfidence } from '@/services/confidence';
import { formatH100, formatPower, shortName } from '@/services/format';
import { extractObservations } from '@/services/observations';
import { satelliteImgURL } from '@/services/satellite';
import { useDashboard } from '@/store';
import type { Lab } from '@/types';

import styles from './FacilityDrawer.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export function FacilityDrawer(): JSX.Element {
  const expandedDC = useDashboard((s) => s.expandedDC);
  const setExpandedDC = useDashboard((s) => s.setExpandedDC);
  const dataCenters = useDashboard((s) => s.dataCenters);
  const timeline = useDashboard((s) => s.timeline);

  // ESC to close.
  useEffect(() => {
    if (!expandedDC) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setExpandedDC(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expandedDC, setExpandedDC]);

  const computed = useMemo(() => {
    if (!expandedDC) return null;
    const dc = dataCenters.find((d) => d.handle === expandedDC);
    if (!dc) return null;
    const tl = timeline.filter((t) => t.dc === dc.handle);
    const cf = scoreConfidence(dc, tl, TODAY_ISO, LAB_COLORS);
    const obs = extractObservations(tl);
    const sortedTL = [...tl].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );

    const override = FACILITY_COORD_OVERRIDES[dc.handle];
    let coords: [number, number] | null = null;
    if (override) coords = [override[0], override[1]];
    else if (dc.lat != null && dc.lon != null) coords = [dc.lat, dc.lon];
    else if (FACILITY_COORDS[dc.handle]) {
      const fb = FACILITY_COORDS[dc.handle];
      coords = [fb[0], fb[1]];
    }

    const lab = dc.co as Lab | 'Other';
    const labColor = lab === 'Other' ? '#555' : LAB_COLORS[lab];
    const chip = lab === 'Other' ? '' : LAB_CHIPS[lab];
    const satUrl = coords ? satelliteImgURL(coords[0], coords[1], 960, 400, 2) : null;

    return { dc, cf, obs, sortedTL, labColor, chip, satUrl };
  }, [expandedDC, dataCenters, timeline]);

  const isOpen = !!computed;

  return (
    <>
      <div
        className={`${styles.overlay}${isOpen ? ` ${styles.open}` : ''}`}
        onClick={() => setExpandedDC(null)}
      />
      <aside
        className={`${styles.drawer}${isOpen ? ` ${styles.open}` : ''}`}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
      >
        {computed && (
          <>
            <div className={styles.closeBar}>
              <div className={styles.closeBarTitle}>
                <span style={{ color: computed.labColor }}>{computed.dc.co}</span>
                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                  {' · '}
                </span>
                {shortName(computed.dc.title)}
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setExpandedDC(null)}
              >
                ✕ CLOSE
              </button>
            </div>

            <div className={styles.body}>
              {computed.satUrl && (
                <div className={styles.satWrap}>
                  <img
                    className={styles.satImage}
                    src={computed.satUrl}
                    alt={`${computed.dc.title} satellite view`}
                  />
                  <div className={styles.satCaption}>ESRI Satellite</div>
                </div>
              )}

              <div className={styles.scoreHeader}>
                <div className={styles.score}>
                  <div
                    className={styles.scoreValue}
                    style={{ color: computed.cf.color }}
                  >
                    {computed.cf.score}
                    <span className={styles.scorePct}>%</span>
                  </div>
                  <div
                    className={styles.scoreLabel}
                    style={{ color: computed.cf.color }}
                  >
                    {computed.cf.label}
                  </div>
                </div>
                <div className={styles.headerInfo}>
                  <div className={styles.headerTitle}>{computed.dc.title}</div>
                  <div
                    className={styles.headerLab}
                    style={{ color: computed.labColor }}
                  >
                    {computed.dc.co}
                    {computed.dc.pj &&
                      ` · ${computed.dc.pj.replace(/#\w+/g, '').trim()}`}
                  </div>
                  {computed.chip && (
                    <div className={styles.headerChip}>{computed.chip}</div>
                  )}
                </div>
              </div>

              <div className={styles.progress}>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.round(computed.cf.powerPct * 100)}%`,
                      background: computed.cf.color,
                    }}
                  />
                </div>
                <div className={styles.progressLabels}>
                  <span>{computed.cf.phaseLabel}</span>
                  <span>{Math.round(computed.cf.powerPct * 100)}% of peak</span>
                  <span>
                    {computed.cf.finalDate
                      ? new Date(computed.cf.finalDate).toLocaleDateString(undefined, {
                          month: 'short',
                          year: '2-digit',
                        })
                      : ''}
                  </span>
                </div>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statCardLabel}>POWER NOW</div>
                  <div className={styles.statCardValue}>
                    {computed.cf.currentPower
                      ? formatPower(computed.cf.currentPower)
                      : '0 MW'}
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statCardLabel}>PEAK</div>
                  <div className={styles.statCardValue}>
                    {computed.cf.maxPower ? formatPower(computed.cf.maxPower) : '—'}
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statCardLabel}>COMPUTE</div>
                  <div className={styles.statCardValue}>
                    {computed.dc.h ? `${formatH100(computed.dc.h)} H100e` : '—'}
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statCardLabel}>COST</div>
                  <div className={styles.statCardValue}>
                    {computed.dc.cs ? `$${computed.dc.cs.toFixed(1)}B` : '—'}
                  </div>
                </div>
              </div>

              <div className={styles.sectionLabel}>SATELLITE OBSERVATIONS</div>
              {computed.obs.length === 0 ? (
                <div className={styles.description}>No observations detected.</div>
              ) : (
                <div className={styles.obsCards}>
                  {computed.obs.map((o, i) => {
                    const variant =
                      o.signal === '+' ? 'pos' : o.signal === '-' ? 'neg' : 'neutral';
                    return (
                      <div key={i} className={`${styles.obsCard} ${styles[variant]}`}>
                        <div className={styles.obsIcon}>{o.icon}</div>
                        <div className={styles.obsCat}>{o.category}</div>
                        <div className={`${styles.obsValue} ${styles[variant] ?? ''}`}>
                          {o.value}
                        </div>
                        <div className={styles.obsMeta}>{o.meta}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={styles.description}>{computed.cf.description}</div>

              <div className={styles.sectionLabel}>
                TIMELINE · {computed.sortedTL.length} MILESTONES
              </div>
              <div className={styles.timeline}>
                {computed.sortedTL.map((t, i) => {
                  const isPast = t.date <= TODAY_ISO;
                  const cleanText = t.st.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
                  return (
                    <div
                      key={i}
                      className={`${styles.timelineItem} ${isPast ? styles.past : styles.future}`}
                    >
                      <div className={styles.timelineDot} />
                      <div
                        className={`${styles.timelineDate} ${isPast ? styles.past : styles.future}`}
                      >
                        {t.date}
                        {!isPast && ' ⏳'}
                      </div>
                      {cleanText && (
                        <div className={styles.timelineText}>{cleanText}</div>
                      )}
                      <div className={styles.timelineMetrics}>
                        {t.h > 0 && <span>{formatH100(t.h)}e</span>}
                        {t.p > 0 && <span>{formatPower(t.p)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
