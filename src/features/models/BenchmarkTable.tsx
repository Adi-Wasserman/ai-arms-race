import { Fragment, useMemo } from 'react';

import { BENCHMARK_META, DOMAIN_GROUPS } from '@/config/benchmarks';
import { LAB_COLORS } from '@/config/labs';
import { MODEL_SPECS } from '@/data/models';
import { useDashboard } from '@/store';
import { activeSeries } from '@/store/selectors';
import type { BenchmarkKey, Lab, Model } from '@/types';

import styles from './BenchmarkTable.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

/** All benchmark keys across every domain group, flattened + deduped. */
const ALL_BENCHMARK_KEYS: readonly BenchmarkKey[] = Array.from(
  new Set(DOMAIN_GROUPS.flatMap((d) => d.benchmarks)),
);

interface CellProps {
  value: number | null;
  allValues: readonly (number | null)[];
  color: string;
  isSelected: boolean;
  dimmed: boolean;
  /** Lower is better (used for cost). */
  lowerBetter?: boolean;
}

function rankClass(rank: number): string {
  if (rank === 1) return styles.gold;
  if (rank === 2) return styles.silver;
  if (rank === 3) return styles.bronze;
  return styles.other;
}

function rankBadge(rank: number): string {
  if (rank === 1) return '1ST';
  if (rank === 2) return '2ND';
  if (rank === 3) return '3RD';
  return `#${rank}`;
}

/** Render one score cell with ranked styling. */
function ScoreCell({
  value,
  allValues,
  color,
  isSelected,
  dimmed,
  lowerBetter = false,
}: CellProps): JSX.Element {
  const tdClass = `${styles.mc} ${dimmed ? styles.dimmed : ''} ${isSelected ? styles.selected : ''}`;
  if (value == null) {
    return (
      <td className={tdClass}>
        <span className={`${styles.cell} ${styles.na}`}>
          <span className={styles.cellScore} style={{ color: 'var(--color-text-quaternary)' }}>
            —
          </span>
        </span>
      </td>
    );
  }
  const valid = allValues.filter((v): v is number => v != null);
  const sorted = [...valid].sort(lowerBetter ? (a, b) => a - b : (a, b) => b - a);
  const rank = sorted.indexOf(value) + 1;
  return (
    <td className={tdClass}>
      <span className={`${styles.cell} ${rankClass(rank)}`}>
        <span className={styles.cellScore} style={{ color }}>
          {value}
        </span>
        <span className={styles.cellRank}>{rankBadge(rank)}</span>
      </span>
    </td>
  );
}

interface HeadToHead {
  winCount: Record<string, number>;
  derivedMetrics: {
    model: Model;
    color: string;
    capPerGW: string;
    capPerH100K: string;
  }[];
}

function computeHeadToHead(selectedModelObjs: readonly Model[]): HeadToHead {
  const winCount: Record<string, number> = {};
  for (const m of selectedModelObjs) winCount[m.name] = 0;

  for (const bk of ALL_BENCHMARK_KEYS) {
    let best: string | null = null;
    let bestVal = -Infinity;
    for (const m of selectedModelObjs) {
      const v = m[bk];
      if (v != null && v > bestVal) {
        bestVal = v;
        best = m.name;
      }
    }
    if (best) winCount[best]++;
  }

  // Current compute per lab for efficiency metrics.
  const state = useDashboard.getState();
  const series = activeSeries(state);
  const past = series.filter((x) => x.date <= TODAY_ISO);
  const current = past.length > 0 ? past[past.length - 1] : null;

  const derivedMetrics = selectedModelObjs.map((m) => {
    const color = LAB_COLORS[m.lab];
    const labH = current ? current[m.lab] : 0;
    const labP = current ? current[`${m.lab}_pw`] : 0;
    const aaIdx = m.aaIndex ?? 0;
    const capPerGW = labP > 0 && aaIdx > 0 ? ((aaIdx / labP) * 1000).toFixed(1) : '—';
    const capPerH100K =
      labH > 0 && aaIdx > 0 ? (aaIdx / (labH / 100_000)).toFixed(1) : '—';
    return { model: m, color, capPerGW, capPerH100K };
  });

  return { winCount, derivedMetrics };
}

export function BenchmarkTable(): JSX.Element {
  const selectedModels = useDashboard((s) => s.selectedModels);
  const toggleModel = useDashboard((s) => s.toggleModel);
  const setSelectedModels = useDashboard((s) => s.setSelectedModels);

  const selectedSet = useMemo(() => new Set(selectedModels), [selectedModels]);

  const selectedModelObjs = useMemo(
    () => MODEL_SPECS.filter((m) => selectedSet.has(m.name)),
    [selectedSet],
  );

  const headToHead = useMemo<HeadToHead | null>(
    () => (selectedModels.length >= 2 ? computeHeadToHead(selectedModelObjs) : null),
    [selectedModels, selectedModelObjs],
  );

  // Gold counts per model for the key finding.
  const goldCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const bk of ALL_BENCHMARK_KEYS) {
      const scores = MODEL_SPECS.map((m) => m[bk]).filter(
        (v): v is number => v != null,
      );
      if (scores.length === 0) continue;
      const maxVal = Math.max(...scores);
      for (const m of MODEL_SPECS) {
        if (m[bk] === maxVal) counts[m.name] = (counts[m.name] ?? 0) + 1;
      }
    }
    return counts;
  }, []);

  const goldLeaders = useMemo(
    () =>
      Object.keys(goldCounts).sort((a, b) => goldCounts[b] - goldCounts[a]),
    [goldCounts],
  );

  const isDimmed = (name: string): boolean =>
    selectedModels.length >= 2 && !selectedSet.has(name);
  const isSelected = (name: string): boolean => selectedSet.has(name);

  return (
    <div className={styles.section}>
      {/* ─── Model selection chips ─── */}
      <div className={styles.heading}>
        SELECT 2-3 MODELS FOR HEAD-TO-HEAD COMPARISON
      </div>
      <div className={styles.chipRow}>
        {MODEL_SPECS.map((m) => {
          const sel = selectedSet.has(m.name);
          const color = LAB_COLORS[m.lab];
          return (
            <button
              key={m.name}
              type="button"
              className={`${styles.chip}${sel ? ` ${styles.selected}` : ''}${m.preview ? ` ${styles.chipPreview}` : ''}`}
              style={
                sel
                  ? {
                      background: `${color}22`,
                      borderColor: color,
                      color,
                    }
                  : undefined
              }
              onClick={() => toggleModel(m.name)}
            >
              {m.name}
              {m.preview && <span className={styles.previewPill}>PREVIEW</span>}
            </button>
          );
        })}
        {selectedModels.length > 0 && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => setSelectedModels([])}
          >
            ✕ CLEAR
          </button>
        )}
      </div>

      {/* ─── Head-to-head comparison panel ─── */}
      {headToHead && (
        <div className={styles.comparison}>
          <div className={styles.comparisonHeading}>HEAD-TO-HEAD COMPARISON</div>
          <div className={styles.winCards}>
            {selectedModelObjs.map((m) => {
              const color = LAB_COLORS[m.lab];
              return (
                <div
                  key={m.name}
                  className={styles.winCard}
                  style={{
                    background: `${color}10`,
                    border: `1px solid ${color}33`,
                  }}
                >
                  <div className={styles.winCardName} style={{ color }}>
                    {m.name}
                  </div>
                  <div className={styles.winCardCount}>
                    {headToHead.winCount[m.name] ?? 0}
                  </div>
                  <div className={styles.winCardLabel}>BENCHMARK WINS</div>
                </div>
              );
            })}
          </div>

          <div className={styles.derivedHeading}>DERIVED METRICS</div>
          <div className={styles.derivedGrid}>
            {headToHead.derivedMetrics.map(({ model, color, capPerGW, capPerH100K }) => (
              <div key={model.name} className={styles.derivedCard}>
                <div className={styles.derivedLab} style={{ color }}>
                  {model.name}
                </div>
                <div className={styles.derivedBody}>
                  AA Index / GW: <b>{capPerGW}</b>
                  <br />
                  AA Index / 100K H100e: <b>{capPerH100K}</b>
                  <br />
                  Speed: <b>{model.speed ?? '—'}</b> t/s
                  <br />
                  Cost: <b>${model.costIn}</b>/M in
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.snapshot}>
        All scores from independent evaluations or provider system cards ·{' '}
        <span className={styles.muted}>Snapshot Mar 2026</span>
      </div>

      {/* ─── Winner matrix ─── */}
      <div className={styles.matrix}>
        <table>
          <thead>
            <tr>
              <th>BENCHMARK</th>
              <th>SOURCE</th>
              {MODEL_SPECS.map((m) => {
                const dim = isDimmed(m.name);
                const sel = isSelected(m.name);
                return (
                  <th
                    key={m.name}
                    className={`${dim ? styles.dimmed : ''} ${sel ? styles.selected : ''}`}
                  >
                    <div className={styles.colName} style={{ color: LAB_COLORS[m.lab] }}>
                      {m.name}
                    </div>
                    <div className={styles.colLab}>{m.lab}</div>
                    {m.preview && <span className={styles.previewBadge}>NOT PUBLIC</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Overall row */}
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
              <td>
                <div className={styles.benchTitle}>⭐ AA Intelligence Index</div>
                <div className={styles.benchDesc}>
                  Composite of 10 evaluations across agents, coding, scientific
                  reasoning, and general knowledge
                </div>
              </td>
              <td style={{ verticalAlign: 'top', paddingTop: 16 }}>
                <div className={styles.benchSource}>Artificial Analysis</div>
                <div className={styles.benchSourceSub}>Independent · v4.0</div>
              </td>
              {MODEL_SPECS.map((m) => (
                <ScoreCell
                  key={m.name}
                  value={m.aaIndex}
                  allValues={MODEL_SPECS.map((x) => x.aaIndex)}
                  color={LAB_COLORS[m.lab]}
                  isSelected={isSelected(m.name)}
                  dimmed={isDimmed(m.name)}
                />
              ))}
            </tr>

            {/* Domain groups */}
            {DOMAIN_GROUPS.map((d) => (
              <Fragment key={d.key}>
                <tr>
                  <td className={styles.domainRow} colSpan={MODEL_SPECS.length + 2}>
                    <span>
                      {d.icon} {d.label}
                    </span>
                  </td>
                </tr>
                {d.benchmarks.map((bk) => {
                  const meta = BENCHMARK_META[bk];
                  if (!meta) return null;
                  const sourceParts = (meta.source || '').split('·');
                  return (
                    <tr key={`bench-${bk}`}>
                      <td style={{ padding: '14px 14px 14px 24px' }}>
                        <div className={styles.benchTitle}>{meta.label}</div>
                        <div className={styles.benchDesc}>{meta.desc}</div>
                      </td>
                      <td style={{ verticalAlign: 'top', paddingTop: 14 }}>
                        <div className={styles.benchSource}>
                          {sourceParts[0]?.trim() || '—'}
                        </div>
                        {sourceParts.length > 1 && (
                          <div className={styles.benchSourceSub}>
                            {sourceParts.slice(1).join('·').trim()}
                          </div>
                        )}
                      </td>
                      {MODEL_SPECS.map((m) => (
                        <ScoreCell
                          key={m.name}
                          value={m[bk]}
                          allValues={MODEL_SPECS.map((x) => x[bk])}
                          color={LAB_COLORS[m.lab]}
                          isSelected={isSelected(m.name)}
                          dimmed={isDimmed(m.name)}
                        />
                      ))}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Key finding ─── */}
      {goldLeaders.length > 1 && (
        <div className={styles.keyFinding}>
          <span className={styles.keyFindingLabel}>KEY FINDING</span>
          <br />
          No single model dominates all benchmarks.{' '}
          {goldLeaders.map((name, i) => {
            const model = MODEL_SPECS.find((m) => m.name === name);
            const color = model ? LAB_COLORS[model.lab as Lab] : '#fff';
            const count = goldCounts[name];
            return (
              <span key={name}>
                <b style={{ color }}>{name}</b> leads {count} benchmark
                {count > 1 ? 's' : ''}
                {i < goldLeaders.length - 2 ? ', ' : ''}
                {i === goldLeaders.length - 2 ? ', and ' : ''}
              </span>
            );
          })}
          . Scores sourced from Artificial Analysis, Epoch AI, GPQA, SWE-bench,
          ARC Prize, CAIS, and provider system cards (Mar 2026 snapshot).
        </div>
      )}

      {/* ─── Model notes ─── */}
      <div className={styles.notesGrid}>
        {MODEL_SPECS.map((m) => {
          const color = LAB_COLORS[m.lab];
          return (
            <div key={m.name} className={`${styles.noteCard}${m.preview ? ` ${styles.noteCardPreview}` : ''}`}>
              <div className={styles.noteName} style={{ color }}>
                {m.name}
                {m.preview && <span className={styles.previewPill}>PREVIEW</span>}
              </div>
              <div className={styles.noteSub}>
                {m.lab} · {m.preview ? 'Unreleased — Project Glasswing' : `Released ${m.released}`}
              </div>
              <div className={styles.noteBody}>{m.notes}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
