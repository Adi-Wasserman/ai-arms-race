import { useMemo } from 'react';

import { LAB_CHIPS, LAB_COLORS } from '@/config/labs';
import { FACILITY_COORD_OVERRIDES, FACILITY_COORDS } from '@/data/facilities';
import { scoreConfidence } from '@/services/confidence';
import { formatH100, formatPower, shortName } from '@/services/format';
import { extractObservations } from '@/services/observations';
import { satelliteImgURL } from '@/services/satellite';
import { useDashboard } from '@/store';
import type { Lab } from '@/types';

import styles from './MapPreview.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export function MapPreview(): JSX.Element {
  const selected = useDashboard((s) => s.selectedFacility);
  const dataCenters = useDashboard((s) => s.dataCenters);
  const timeline = useDashboard((s) => s.timeline);

  const computed = useMemo(() => {
    if (!selected) return null;
    const dc = dataCenters.find((d) => d.handle === selected);
    if (!dc) return null;
    // Resolution order: verified override → Epoch lat/lon → hardcoded fallback.
    const override = FACILITY_COORD_OVERRIDES[dc.handle];
    let coords: [number, number] | null = null;
    if (override) coords = [override[0], override[1]];
    else if (dc.lat != null && dc.lon != null) coords = [dc.lat, dc.lon];
    else if (FACILITY_COORDS[dc.handle]) {
      const fb = FACILITY_COORDS[dc.handle];
      coords = [fb[0], fb[1]];
    }
    if (!coords) return null;

    const tl = timeline.filter((t) => t.dc === dc.handle);
    const cf = scoreConfidence(dc, tl, TODAY_ISO, LAB_COLORS);
    const obs = extractObservations(tl);

    const sorted = [...tl].sort((a, b) => (a.date > b.date ? -1 : 1));
    const latest = sorted[0];
    const statusText = latest?.st
      ? latest.st.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 160)
      : cf.description;
    const statusDate = latest?.date ?? '';

    const lab = dc.co as Lab | 'Other';
    const color = lab === 'Other' ? '#555' : LAB_COLORS[lab];
    const chip = lab === 'Other' ? '' : LAB_CHIPS[lab];
    const satUrl = satelliteImgURL(coords[0], coords[1], 640, 440, 2);

    return { dc, coords, cf, obs, statusText, statusDate, color, chip, satUrl };
  }, [selected, dataCenters, timeline]);

  if (!computed) {
    return (
      <aside className={styles.panel}>
        <div className={styles.empty}>
          Hover or click any pin to see facility details.
        </div>
      </aside>
    );
  }

  const { dc, cf, obs, statusText, statusDate, color, chip, satUrl } = computed;

  return (
    <aside className={styles.panel}>
      <div className={styles.satWrap}>
        <img className={styles.satImage} src={satUrl} alt={`${dc.title} satellite view`} />
        <div className={styles.satBadge} style={{ borderColor: `${color}33` }}>
          <span style={{ color }}>{dc.co}</span> · {shortName(dc.title)}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.title}>{dc.title}</div>
            <div className={styles.subtitle} style={{ color }}>
              {dc.co}
              {dc.pj && ` · ${dc.pj.replace(/#\w+/g, '').trim()}`}
            </div>
            {chip && <div className={styles.chip}>{chip}</div>}
          </div>
          <div className={styles.scoreWrap}>
            <div className={styles.score} style={{ color: cf.color }}>
              {cf.score}
              <span className={styles.scorePct}>%</span>
            </div>
            <div className={styles.scoreLabel} style={{ color: cf.color }}>
              {cf.label}
            </div>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div>
            <div className={styles.statLabel}>POWER NOW</div>
            <div className={styles.statValue}>
              {cf.currentPower ? formatPower(cf.currentPower) : '0 MW'}
            </div>
          </div>
          <div>
            <div className={styles.statLabel}>PEAK</div>
            <div className={styles.statValue}>
              {cf.maxPower ? formatPower(cf.maxPower) : '—'}
            </div>
          </div>
          <div>
            <div className={styles.statLabel}>COMPUTE</div>
            <div className={styles.statValue}>
              {dc.h ? `${formatH100(dc.h)} H100e` : '—'}
            </div>
          </div>
          <div>
            <div className={styles.statLabel}>PHASE</div>
            <div className={styles.statValue}>{cf.phaseLabel}</div>
          </div>
        </div>

        <div className={styles.bar}>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{
                width: `${Math.round(cf.powerPct * 100)}%`,
                background: cf.color,
              }}
            />
          </div>
          <div className={styles.barLabels}>
            <span>{Math.round(cf.powerPct * 100)}% of peak</span>
            <span>
              {cf.finalDate
                ? new Date(cf.finalDate).toLocaleDateString(undefined, {
                    month: 'short',
                    year: '2-digit',
                  })
                : ''}
            </span>
          </div>
        </div>

        {obs.length > 0 && (
          <div className={styles.observations}>
            {obs.map((o, i) => (
              <div key={i} className={styles.obsRow}>
                {o.icon}{' '}
                <span
                  className={`${styles.obsValue} ${
                    o.signal === '+'
                      ? styles.obsValuePos
                      : o.signal === '-'
                        ? styles.obsValueNeg
                        : ''
                  }`}
                >
                  {o.value}
                </span>{' '}
                <span className={styles.obsMeta}>{o.meta}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.status}>
          {statusDate && <span className={styles.statusDate}>{statusDate}: </span>}
          {statusText}
        </div>
      </div>
    </aside>
  );
}
