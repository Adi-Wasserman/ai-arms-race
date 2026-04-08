import { useEffect, useMemo, useState } from 'react';

import { LAB_COLORS } from '@/config/labs';
import { useEpochChipOwners } from '@/hooks/useEpochChipOwners';
import { formatH100 } from '@/services/format';
import { OWNER_TO_LAB, type OwnerSnapshot } from '@/types';

import styles from './HardwareRealityCheckPanel.module.css';

/* ─────────────────────────────────────────────────────────────
   "Hardware Ownership Reality Check" — collapsible side panel.

   A right-anchored editorial card that grounds the user in the
   single most counter-intuitive data point in the section: most
   frontier labs do not own the chips they train on. Sourced
   entirely from the live Epoch AI Chip Owners ZIP.

   Panel is dismissible — preference persists across sessions
   via localStorage. When dismissed, a small "Show reality check"
   button appears in the same slot so it's recoverable without
   reloading or resetting state.
   ───────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'hardwareRealityCheckDismissed_v1';
const SOURCE_URL = 'https://epoch.ai/data/ai_chip_owners.zip';

const FOOTNOTE_TEXT =
  'Owned H100e numbers are the raw median values directly from Epoch AI ' +
  'Chip Owners ZIP (live). % Owned for OpenAI and Anthropic uses the ' +
  'documented override because Epoch attributes those chips to the ' +
  'hyperscalers, not the labs. All other values are 100% data-derived ' +
  'with no manual adjustment.';

/**
 * Read the dismissed flag synchronously on first render so the
 * panel does not flash visible-then-hidden when it has been
 * dismissed in a prior session. SSR-safe via window guard.
 */
function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(v: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (v) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage unavailable — silent no-op */
  }
}

interface BarRow {
  owner: string;
  h100e: number;
  pct: number;
  color: string;
}

/**
 * Pick a per-owner color: lab brand color if the owner maps to a
 * tracked lab, neutral gray otherwise. Keeps the palette consistent
 * with the OwnershipSidePanel and OwnershipLabTable.
 */
function ownerColor(owner: string): string {
  const lab = OWNER_TO_LAB[owner as keyof typeof OWNER_TO_LAB];
  return lab ? LAB_COLORS[lab] : '#7a7a7a';
}

function buildBars(snapshots: readonly OwnerSnapshot[]): BarRow[] {
  if (snapshots.length === 0) return [];
  const top5 = [...snapshots]
    .sort((a, b) => b.h100e - a.h100e)
    .slice(0, 5);
  const max = top5[0]?.h100e || 1;
  return top5.map((s) => ({
    owner: s.owner,
    h100e: s.h100e,
    pct: (s.h100e / max) * 100,
    color: ownerColor(s.owner),
  }));
}

/* ─────────────────────────────────────────────────────────────
   Sparkline — total cumulative H100e across ALL owners, since 2022.

   Single line, normalized to its own min/max so the *shape* of
   total ownership growth is visible regardless of absolute scale.
   The point is not to compare numbers — those are in the bar
   chart above — it's to show that the total owned fleet has
   roughly tripled since 2022.
   ───────────────────────────────────────────────────────────── */

interface SparkSeries {
  values: number[];
  startLabel: string;
  endLabel: string;
  startValue: number;
  endValue: number;
}

function buildTotalSparkline(
  timeseries: ReadonlyArray<{ endDate: string; byOwner: Record<string, number> }>,
): SparkSeries | null {
  const since = timeseries.filter((p) => p.endDate >= '2022-01-01');
  if (since.length < 2) return null;
  const totals = since.map((p) =>
    Object.values(p.byOwner).reduce((sum, v) => sum + (v ?? 0), 0),
  );
  // Trim leading zeros (defensive — the live ZIP doesn't have any
  // pre-2022 zeros at the global level, but it costs nothing to be
  // robust against future schema drift).
  const firstNonZero = totals.findIndex((v) => v > 0);
  if (firstNonZero === -1) return null;
  const values = totals.slice(firstNonZero);
  const dates = since.slice(firstNonZero).map((p) => p.endDate);
  return {
    values,
    startLabel: `'${dates[0].slice(2, 4)}`,
    endLabel: `'${dates[dates.length - 1].slice(2, 4)}`,
    startValue: values[0],
    endValue: values[values.length - 1],
  };
}

/* ─────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────── */

export function HardwareRealityCheckPanel(): JSX.Element {
  const { data, loading, error } = useEpochChipOwners();
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

  // Persist dismiss state — fires once per actual change, not on every render.
  useEffect(() => {
    writeDismissed(dismissed);
  }, [dismissed]);

  const bars = useMemo<BarRow[]>(
    () => (data ? buildBars(data.latestByOwner) : []),
    [data],
  );
  const sparkline = useMemo<SparkSeries | null>(
    () => (data ? buildTotalSparkline(data.timeseries) : null),
    [data],
  );

  // ─── Dismissed state ───
  if (dismissed) {
    return (
      <div className={styles.dismissedSlot}>
        <button
          type="button"
          className={styles.showBtn}
          onClick={() => setDismissed(false)}
          title="Restore the Hardware Ownership Reality Check panel"
        >
          <span aria-hidden="true">⚙</span> Show reality check
        </button>
      </div>
    );
  }

  return (
    <aside
      className={styles.panel}
      aria-labelledby="hw-reality-check-title"
    >
      {/* ─── Header ─── */}
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h3 id="hw-reality-check-title" className={styles.title}>
            Hardware Ownership Reality Check
          </h3>
          <div className={styles.subtitle}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.subtitleText}>
              Epoch AI <em>(live ZIP)</em>
            </span>
            <a
              className={styles.sourceLink}
              href={SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              title="Source: ai_chip_owners.zip (opens in new tab)"
            >
              ai_chip_owners.zip ↗
            </a>
          </div>
        </div>
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss reality check panel"
          title="Hide this panel — preference saved for next visit"
        >
          ×
        </button>
      </header>

      {/* ─── Loading / error ─── */}
      {!data && loading && (
        <div className={styles.skeleton}>Loading Epoch chip owners…</div>
      )}
      {!data && error && (
        <div className={styles.errorMsg}>
          Failed to load: {error}
        </div>
      )}

      {data && (
        <div className={styles.body}>
          {/* ─── Column 1 — Top 5 owners bar chart ─── */}
          <div className={styles.bodyCol}>
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>
                Top 5 owners{' '}
                <span className={styles.sectionMeta}>(median H100e)</span>
              </h4>
              <ol className={styles.barList}>
                {bars.map((b) => (
                  <li key={b.owner} className={styles.barRow}>
                    <span className={styles.barOwner}>{b.owner}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${b.pct}%`, background: b.color }}
                      />
                    </div>
                    <span className={styles.barValue}>
                      {formatH100(b.h100e)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* ─── Column 2 — Mini time-series since 2022 ─── */}
          <div className={styles.bodyCol}>
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>
                Total ownership growth{' '}
                <span className={styles.sectionMeta}>since 2022</span>
              </h4>
              {sparkline ? (
                <div className={styles.sparkBlock}>
                  <Sparkline values={sparkline.values} />
                  <div className={styles.sparkCaption}>
                    <span>
                      {sparkline.startLabel}{' '}
                      <strong>{formatH100(sparkline.startValue)}</strong>
                    </span>
                    <span className={styles.sparkArrow}>→</span>
                    <span>
                      {sparkline.endLabel}{' '}
                      <strong>{formatH100(sparkline.endValue)}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className={styles.skeleton}>—</div>
              )}
            </section>
          </div>

          {/* ─── Column 3 — Bullets + Footnote ─── */}
          <div className={styles.bodyCol}>
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>What this means</h4>
              <ul className={styles.bullets}>
                <li>
                  <strong style={{ color: '#9a9a9a' }}>OpenAI</strong> owns{' '}
                  <strong>0%</strong> of its chips → fully cloud-dependent
                </li>
                <li>
                  <strong style={{ color: LAB_COLORS.Gemini }}>Gemini</strong>{' '}
                  owns the{' '}
                  <strong>largest single fleet on Earth</strong> (TPUs)
                </li>
                <li>
                  <strong style={{ color: LAB_COLORS.Anthropic }}>
                    Anthropic
                  </strong>{' '}
                  <strong>25% owned and rising</strong> (Trainium + Google
                  deal)
                </li>
              </ul>
            </section>

            <p className={styles.footnote}>
              <span className={styles.footnoteMark}>†</span> {FOOTNOTE_TEXT}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sparkline — local helper.

   Self-normalizing (own min/max) so the shape of total ownership
   growth is visible regardless of absolute scale. ~16px tall,
   stretches to fill its container width via viewBox + 100% width.
   ───────────────────────────────────────────────────────────── */

function Sparkline({ values }: { values: number[] }): JSX.Element {
  const W = 280;
  const H = 44;
  const PAD_X = 4;
  const PAD_Y = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (W - PAD_X * 2) / Math.max(1, values.length - 1);

  const points = values
    .map((v, i) => {
      const x = PAD_X + i * stepX;
      const y = H - PAD_Y - ((v - min) / span) * (H - PAD_Y * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Build a closed area path (polyline + bottom corners) so we
  // can fill it with a soft gradient under the line.
  const areaPath = `M ${points.split(' ').join(' L ')} L ${(W - PAD_X).toFixed(1)},${(H - PAD_Y).toFixed(1)} L ${PAD_X.toFixed(1)},${(H - PAD_Y).toFixed(1)} Z`;

  const lastIdx = values.length - 1;
  const lastX = PAD_X + lastIdx * stepX;
  const lastY = H - PAD_Y - ((values[lastIdx] - min) / span) * (H - PAD_Y * 2);

  return (
    <svg
      className={styles.spark}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Total cumulative H100e ownership growth since 2022"
    >
      <defs>
        <linearGradient id="hw-spark-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d8eea" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#4d8eea" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#hw-spark-fade)" />
      <polyline
        points={points}
        fill="none"
        stroke="#4d8eea"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.2" fill="#4d8eea" />
    </svg>
  );
}
