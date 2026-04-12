import { useState } from 'react';

import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { FLEET_ESTIMATES } from '@/data/fleet';
import { formatH100 } from '@/services/format';
import { useDashboard } from '@/store';
import type { EpochDataCenter, Lab } from '@/types';

import styles from './ComputeBreakdownCard.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const FLEET_LEG_INFO: Record<
  string,
  { label: string; source: string; sourceUrl: string; conversion: string }
> = {
  'EAI-AWS': {
    label: 'AWS Trainium2 (Project Rainier)',
    source: 'Amazon — Project Rainier',
    sourceUrl:
      'https://www.aboutamazon.com/news/aws/aws-project-rainier-ai-trainium-chips-compute-cluster',
    conversion: 'Trn2 ≈ 0.93 H100e',
  },
  'EAI-GCP': {
    label: 'Google Cloud TPU',
    source: 'Anthropic — GCP TPU expansion',
    sourceUrl:
      'https://www.anthropic.com/news/expanding-our-use-of-google-cloud-tpus-and-services',
    conversion: 'Blended ~1.4 H100e/chip',
  },
  'EAI-AZR': {
    label: 'Azure / NVIDIA Grace Blackwell',
    source: 'NVIDIA — MSFT-NVDA-Anthropic',
    sourceUrl:
      'https://blogs.nvidia.com/blog/microsoft-nvidia-anthropic-announce-partnership/',
    conversion: 'GB200 ≈ 2.5 H100e',
  },
  EGC: {
    label: 'Internal TPU fleet (est.)',
    source: 'SemiAnalysis · Fubon · Google Ironwood',
    sourceUrl:
      'https://cloud.google.com/blog/products/ai-machine-learning/ironwood-tpu-age-of-inference',
    conversion: 'Blended ~1.2 H100e/chip',
  },
};

const LAB_FLEET_HANDLES: Record<Lab, string[]> = {
  OpenAI: [],
  Anthropic: ['EAI-AWS', 'EAI-GCP', 'EAI-AZR'],
  Gemini: ['EGC'],
  Meta: [],
  xAI: [],
};

interface FleetStep {
  date: string;
  h100e: number;
  isFuture: boolean;
}

interface FleetLeg {
  handle: string;
  label: string;
  source: string;
  sourceUrl: string;
  conversion: string;
  currentH100e: number;
  steps: FleetStep[];
}

interface FacilityInfo {
  name: string;
  h100e: number;
  powerMw: number;
}

interface LabBreakdown {
  lab: Lab;
  satellite: number;
  facilities: FacilityInfo[];
  legs: FleetLeg[];
  cloudLeaseTotal: number;
  total: number;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function ComputeBreakdownCard(): JSX.Element | null {
  const [open, setOpen] = useState(false);

  const seriesEpoch = useDashboard((s) => s.seriesEpoch);
  const seriesFull = useDashboard((s) => s.seriesFull);
  const dataCenters = useDashboard((s) => s.dataCenters);
  const dataVersion = useDashboard((s) => s.dataVersion);
  const scope = useDashboard((s) => s.scope);

  const breakdowns = (() => {
    const epochPast = seriesEpoch.filter((x) => x.date <= TODAY_ISO);
    const fullPast = seriesFull.filter((x) => x.date <= TODAY_ISO);
    const epochPt = epochPast.length > 0 ? epochPast[epochPast.length - 1] : null;
    const fullPt = fullPast.length > 0 ? fullPast[fullPast.length - 1] : null;
    if (!epochPt || !fullPt) return [] as LabBreakdown[];

    // Group facilities by lab, sorted by H100e desc, exclude cloud-lease handles
    const fleetHandleSet = new Set(Object.keys(FLEET_LEG_INFO));
    const facilitiesByLab = new Map<Lab, FacilityInfo[]>();
    for (const dc of dataCenters) {
      if (dc.co === 'Other' || fleetHandleSet.has(dc.handle)) continue;
      const lab = dc.co as Lab;
      if (!facilitiesByLab.has(lab)) facilitiesByLab.set(lab, []);
      if (dc.h > 0) {
        facilitiesByLab.get(lab)!.push({
          name: dc.title || dc.handle,
          h100e: dc.h,
          powerMw: dc.pw,
        });
      }
    }
    for (const arr of facilitiesByLab.values()) {
      arr.sort((a, b) => b.h100e - a.h100e);
    }

    return LAB_NAMES.map((lab): LabBreakdown => {
      const satellite = epochPt[lab];
      const total = fullPt[lab];
      const facilities = facilitiesByLab.get(lab) ?? [];
      const handles = LAB_FLEET_HANDLES[lab];
      const legs: FleetLeg[] = handles.map((handle) => {
        const allEntries = FLEET_ESTIMATES.filter((e) => e[1] === handle);
        const steps: FleetStep[] = allEntries.map((e) => ({
          date: e[0], h100e: e[2], isFuture: e[0] > TODAY_ISO,
        }));
        const pastEntries = allEntries.filter((e) => e[0] <= TODAY_ISO);
        const latest = pastEntries.length > 0 ? pastEntries[pastEntries.length - 1] : null;
        const info = FLEET_LEG_INFO[handle] ?? { label: handle, source: '', sourceUrl: '', conversion: '' };
        return { handle, ...info, currentH100e: latest ? latest[2] : 0, steps };
      });
      return {
        lab, satellite, facilities, legs,
        cloudLeaseTotal: legs.reduce((s, l) => s + l.currentH100e, 0),
        total,
      };
    });
  })();

  if (breakdowns.length === 0) return null;
  const isFleet = scope === 'fleet';

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.toggleBtn}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.chevron}>{open ? '▾' : '▸'}</span>
          <h3 className={styles.title}>How We Calculate Each Lab's H100e</h3>
        </button>
        <span className={styles.headerBadge}>
          Viewing: <strong>{isFleet ? '+ CLOUD-LEASE' : 'SAT-VERIFIED'}</strong>
        </span>
      </header>

      {open && (
        <div className={styles.body}>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.dotSat} /> Satellite-verified
            </span>
            <span className={styles.legendItem}>
              <span className={styles.dotLease} /> Cloud-lease estimate
            </span>
            <span className={styles.legendItem}>
              <span className={styles.dotFuture} /> Future ramp
            </span>
          </div>

          {(() => {
            const TOP_ROW_LABS = new Set<Lab>(['Anthropic', 'Gemini', 'OpenAI']);
            const complex = breakdowns.filter((b) => TOP_ROW_LABS.has(b.lab));
            const simple = breakdowns.filter((b) => !TOP_ROW_LABS.has(b.lab));

            const renderCard = (b: LabBreakdown) => {
              const color = LAB_COLORS[b.lab];
              const hasLegs = b.legs.length > 0;
              return (
                <div
                  key={b.lab}
                  className={styles.labRow}
                  style={{ '--lab-color': color } as React.CSSProperties}
                >
                  <div className={styles.labHeader}>
                    <span className={styles.labName} style={{ color }}>{b.lab}</span>
                    <span className={styles.labTotal}>
                      <span className={styles.labEq}>=</span>
                      <span style={{ color }}>{formatH100(b.total)}</span>
                      <span className={styles.labUnit}>H100e</span>
                    </span>
                  </div>

                  <div className={styles.calcRow}>
                    <span className={styles.dotSat} />
                    <span className={styles.calcValue}>{formatH100(b.satellite)}</span>
                    <span className={styles.calcLabel}>Satellite-verified</span>
                    <span className={`${styles.confBadge} ${styles.confHigh}`}>HIGH</span>
                  </div>

                  {b.facilities.length > 0 && (
                    <div className={styles.facilityList}>
                      {b.facilities.map((f) => (
                        <div key={f.name} className={styles.facilityRow}>
                          <span className={styles.facilityName}>{f.name}</span>
                          <span className={styles.facilityVal}>{formatH100(f.h100e)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {hasLegs ? b.legs.map((leg) => (
                    <div key={leg.handle} className={styles.legBlock}>
                      <div className={styles.calcRow}>
                        <span className={styles.calcOp}>+</span>
                        <span className={styles.dotLease} />
                        <span className={styles.calcValue}>
                          {leg.currentH100e > 0 ? formatH100(leg.currentH100e) : '0'}
                        </span>
                        <span className={styles.calcLabel}>{leg.label}</span>
                        <span className={`${styles.confBadge} ${styles.confEst}`}>EST</span>
                      </div>
                      <div className={styles.calcMeta}>
                        {leg.sourceUrl ? (
                          <a
                            className={styles.calcSourceLink}
                            href={leg.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {leg.source}
                          </a>
                        ) : (
                          <strong>{leg.source}</strong>
                        )}
                        <span className={styles.metaSep}>·</span>
                        <strong>{leg.conversion}</strong>
                      </div>
                      <div className={styles.rampTimeline}>
                        <span className={styles.rampLabel}>Ramp:</span>
                        {leg.steps.map((step) => (
                          <span
                            key={step.date}
                            className={`${styles.rampStep} ${step.isFuture ? styles.rampFuture : styles.rampPast}`}
                          >
                            <span className={styles.rampDate}>{fmtDate(step.date)}</span>
                            <span className={styles.rampVal}>{formatH100(step.h100e)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className={styles.noLegs}>
                      {b.lab === 'Meta' || b.lab === 'xAI'
                        ? 'Owns all hardware — no cloud-lease'
                        : 'All capacity via satellite'}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div className={styles.rows}>
                {complex.length > 0 && (
                  <div className={`${styles.rowGroup} ${styles.rowGroupTop}`}>
                    {complex.map(renderCard)}
                  </div>
                )}
                {simple.length > 0 && (
                  <div className={`${styles.rowGroup} ${styles.rowGroupBottom}`}>
                    {simple.map(renderCard)}
                  </div>
                )}
              </div>
            );
          })()}

          <p className={styles.footnote}>
            Satellite data updates live from Epoch AI. Cloud-lease H100e are
            derived from announced chip counts / power targets using the
            conversion ratios shown above — none are directly stated in
            announcements. H100e ≈ 989 BF16 TFLOPS.
          </p>

          <div className={styles.sourceBar}>
            <div className={styles.sourceBarRow}>
              <span className={styles.sourceBarLabel}>Sources:</span>
              <a href="https://epoch.ai/data/ai-chip-owners" target="_blank" rel="noreferrer">
                Epoch AI
              </a>
              <span className={styles.sourceBarSep}>&middot;</span>
              <a
                href="https://www.aboutamazon.com/news/aws/aws-project-rainier-ai-trainium-chips-compute-cluster"
                target="_blank"
                rel="noreferrer"
              >
                Amazon
              </a>
              <span className={styles.sourceBarSep}>&middot;</span>
              <a
                href="https://www.anthropic.com/news/expanding-our-use-of-google-cloud-tpus-and-services"
                target="_blank"
                rel="noreferrer"
              >
                Anthropic
              </a>
              <span className={styles.sourceBarSep}>&middot;</span>
              <a
                href="https://blogs.nvidia.com/blog/microsoft-nvidia-anthropic-announce-partnership/"
                target="_blank"
                rel="noreferrer"
              >
                NVIDIA
              </a>
              <span className={styles.sourceBarSep}>&middot;</span>
              <a
                href="https://semianalysis.com/2024/09/13/google-multi-datacenter-training/"
                target="_blank"
                rel="noreferrer"
              >
                SemiAnalysis
              </a>
              <span className={styles.sourceBarSep}>&middot;</span>
              <a
                href="https://cloud.google.com/blog/products/ai-machine-learning/ironwood-tpu-age-of-inference"
                target="_blank"
                rel="noreferrer"
              >
                Google Cloud
              </a>
              <span className={styles.sourceBarSep}>&middot;</span>
              <a
                href="https://www.investing.com/news/stock-market-news/2026-tpu-server-outlook-google-takes-swing-at-the-king-4423670"
                target="_blank"
                rel="noreferrer"
              >
                Fubon Research
              </a>
            </div>
            <div className={styles.sourceBarRow}>
              <span className={styles.sourceBarLabel}>Ramp method:</span>
              <span className={styles.sourceBarStatic}>
                Each announcement gives a start date + chip count and a target date +
                chip count. We linearly interpolate between those endpoints to produce
                quarterly H100e milestones. Solid pills = announced capacity already
                online. Dashed pills = future capacity not yet delivered.
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
