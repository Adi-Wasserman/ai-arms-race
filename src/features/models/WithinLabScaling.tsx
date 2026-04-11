import type {
  Chart as ChartJS,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { forwardRef, useMemo, type ForwardedRef } from 'react';

import { BaseChart } from '@/components/charts/BaseChart';

import styles from './WithinLabScaling.module.css';

/* ─────────────────────────────────────────────────────────────
   Within-Lab Scaling chart — dual-axis line showing that
   successive models in the GPT and Claude families use more
   training compute AND score higher on benchmarks.

   X = generation (1–4), annotated with model names.
   Left Y = Training FLOPs (log scale).
   Right Y = Approximate performance (AA Index-style, 0–70).
   ───────────────────────────────────────────────────────────── */

interface ModelGen {
  label: string;
  flops: number;
  score: number;
}

const GPT_FAMILY: readonly ModelGen[] = [
  { label: 'GPT-3',   flops: 3.14e23, score: 22 },
  { label: 'GPT-4',   flops: 2.1e25,  score: 42 },
  { label: 'GPT-4o',  flops: 6.4e25,  score: 52 },
  { label: 'GPT-5.4', flops: 1.8e26,  score: 60 },
];

const CLAUDE_FAMILY: readonly ModelGen[] = [
  { label: 'Claude 2',       flops: 5e23,  score: 20 },
  { label: 'Claude 3 Opus',  flops: 1.8e25, score: 40 },
  { label: 'Claude Opus 4',  flops: 8e25,  score: 50 },
  { label: 'Claude Opus 4.6', flops: 2e26,  score: 55 },
];

const COLOR_GPT = '#00ff87';
const COLOR_CLAUDE = '#ffaa00';

function computeChart(): { data: ChartData<'line'>; options: ChartOptions<'line'> } {
  const gens = [1, 2, 3, 4];

  const data: ChartData<'line'> = {
    labels: gens,
    datasets: [
      // ── FLOPs lines ──
      {
        label: 'GPT — Training FLOPs',
        data: GPT_FAMILY.map((m) => m.flops),
        borderColor: COLOR_GPT,
        backgroundColor: `${COLOR_GPT}33`,
        borderWidth: 2.5,
        pointRadius: 7,
        pointHoverRadius: 10,
        pointBackgroundColor: `${COLOR_GPT}55`,
        pointBorderColor: COLOR_GPT,
        pointBorderWidth: 2,
        tension: 0.25,
        yAxisID: 'yFlops',
      },
      {
        label: 'Claude — Training FLOPs',
        data: CLAUDE_FAMILY.map((m) => m.flops),
        borderColor: COLOR_CLAUDE,
        backgroundColor: `${COLOR_CLAUDE}33`,
        borderWidth: 2.5,
        pointRadius: 7,
        pointHoverRadius: 10,
        pointBackgroundColor: `${COLOR_CLAUDE}55`,
        pointBorderColor: COLOR_CLAUDE,
        pointBorderWidth: 2,
        tension: 0.25,
        yAxisID: 'yFlops',
      },
      // ── Performance lines (dashed) ──
      {
        label: 'GPT — Performance',
        data: GPT_FAMILY.map((m) => m.score),
        borderColor: COLOR_GPT,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: `${COLOR_GPT}44`,
        pointBorderColor: `${COLOR_GPT}88`,
        pointBorderWidth: 1.5,
        pointStyle: 'rectRot',
        tension: 0.25,
        yAxisID: 'yScore',
      },
      {
        label: 'Claude — Performance',
        data: CLAUDE_FAMILY.map((m) => m.score),
        borderColor: COLOR_CLAUDE,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: `${COLOR_CLAUDE}44`,
        pointBorderColor: `${COLOR_CLAUDE}88`,
        pointBorderWidth: 1.5,
        pointStyle: 'rectRot',
        tension: 0.25,
        yAxisID: 'yScore',
      },
    ],
  };

  // Build annotations — model name labels below x-axis positions
  const annotations: Record<string, unknown> = {};

  // GPT labels (row 1 — above x-axis)
  GPT_FAMILY.forEach((m, i) => {
    annotations[`gpt${i}`] = {
      type: 'label',
      xValue: i + 1,
      yValue: m.flops,
      content: [m.label],
      color: `${COLOR_GPT}bb`,
      font: { size: 9, weight: 600 },
      position: { x: 'start', y: 'end' },
      xAdjust: -4,
      yAdjust: -12,
      backgroundColor: 'transparent',
    };
  });

  // Claude labels (row 2 — below their points)
  CLAUDE_FAMILY.forEach((m, i) => {
    annotations[`claude${i}`] = {
      type: 'label',
      xValue: i + 1,
      yValue: m.flops,
      content: [m.label],
      color: `${COLOR_CLAUDE}bb`,
      font: { size: 9, weight: 600 },
      position: { x: 'end', y: 'start' },
      xAdjust: 4,
      yAdjust: 14,
      backgroundColor: 'transparent',
    };
  });

  // Performance gain annotation — GPT gen 1→4
  const gptGain = GPT_FAMILY[GPT_FAMILY.length - 1].score - GPT_FAMILY[0].score;
  annotations['gptGain'] = {
    type: 'label',
    xValue: 4,
    yValue: GPT_FAMILY[GPT_FAMILY.length - 1].score,
    content: [`+${gptGain} pts`],
    color: `${COLOR_GPT}99`,
    font: { size: 10, weight: 700, family: "var(--font-mono, 'SF Mono', monospace)" },
    position: { x: 'end', y: 'center' },
    xAdjust: 36,
    yAdjust: 0,
    backgroundColor: 'transparent',
    yScaleID: 'yScore',
  };

  const claudeGain = CLAUDE_FAMILY[CLAUDE_FAMILY.length - 1].score - CLAUDE_FAMILY[0].score;
  annotations['claudeGain'] = {
    type: 'label',
    xValue: 4,
    yValue: CLAUDE_FAMILY[CLAUDE_FAMILY.length - 1].score,
    content: [`+${claudeGain} pts`],
    color: `${COLOR_CLAUDE}99`,
    font: { size: 10, weight: 700, family: "var(--font-mono, 'SF Mono', monospace)" },
    position: { x: 'end', y: 'center' },
    xAdjust: 36,
    yAdjust: 0,
    backgroundColor: 'transparent',
    yScaleID: 'yScore',
  };

  const options: ChartOptions<'line'> = {
    layout: { padding: { top: 20, right: 55, bottom: 10, left: 10 } },
    scales: {
      x: {
        type: 'linear',
        min: 0.5,
        max: 4.5,
        title: {
          display: true,
          text: 'Model Generation',
          color: 'rgba(255, 255, 255, 0.35)',
          font: { size: 11 },
        },
        ticks: {
          stepSize: 1,
          callback: (v) => {
            const i = (v as number) - 1;
            if (i < 0 || i >= GPT_FAMILY.length) return '';
            return `Gen ${v}`;
          },
        },
      },
      yFlops: {
        type: 'logarithmic',
        position: 'left',
        title: {
          display: true,
          text: 'Training Compute (FLOPs)',
          color: 'rgba(255, 255, 255, 0.35)',
          font: { size: 10 },
        },
        min: 1e23,
        max: 1e27,
        ticks: {
          callback: (v) => {
            const exp = Math.round(Math.log10(v as number));
            return `10^${exp}`;
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
      },
      yScore: {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: 'Performance Score',
          color: 'rgba(255, 255, 255, 0.35)',
          font: { size: 10 },
        },
        min: 0,
        max: 70,
        ticks: {
          stepSize: 10,
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        displayColors: true,
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex;
            if (idx == null) return '';
            const dsIdx = items[0]?.datasetIndex ?? 0;
            const isGpt = dsIdx === 0 || dsIdx === 2;
            const family = isGpt ? GPT_FAMILY : CLAUDE_FAMILY;
            return family[idx]?.label ?? '';
          },
          label: (ctx) => {
            const idx = ctx.dataIndex;
            const dsIdx = ctx.datasetIndex;
            const isFlops = dsIdx <= 1;
            const isGpt = dsIdx === 0 || dsIdx === 2;
            const family = isGpt ? GPT_FAMILY : CLAUDE_FAMILY;
            const m = family[idx];
            if (!m) return '';
            if (isFlops) {
              const exp = Math.floor(Math.log10(m.flops));
              const man = m.flops / Math.pow(10, exp);
              return ` FLOPs: ${man.toFixed(1)}e${exp}`;
            }
            return ` Score: ${m.score}`;
          },
        },
      },
      annotation: { annotations } as unknown as never,
    },
  };

  return { data, options };
}

function WithinLabScalingInner(
  _props: Record<string, unknown>,
  ref: ForwardedRef<ChartJS<'line'>>,
): JSX.Element {
  const { data, options } = useMemo(() => computeChart(), []);

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        WITHIN-LAB SCALING: MORE COMPUTE → BETTER PERFORMANCE
      </div>
      <div className={styles.subheading}>
        GPT & CLAUDE FAMILIES · EACH GENERATION USES MORE FLOPs AND SCORES HIGHER
      </div>

      <div className={styles.legend}>
        <span className={styles.legendGroup}>
          <span className={styles.legendLine} style={{ background: COLOR_GPT }} />
          <span style={{ color: COLOR_GPT }}>GPT family</span>
          <span className={styles.legendMeta}>— solid = FLOPs, dashed = score</span>
        </span>
        <span className={styles.legendGroup}>
          <span className={styles.legendLine} style={{ background: COLOR_CLAUDE }} />
          <span style={{ color: COLOR_CLAUDE }}>Claude family</span>
          <span className={styles.legendMeta}>— solid = FLOPs, dashed = score</span>
        </span>
      </div>

      <div className={styles.chartWrapper}>
        <BaseChart<'line'>
          ref={ref}
          type="line"
          data={data}
          options={options}
          ariaLabel="Within-lab scaling: GPT and Claude model families"
        />
      </div>

      <div className={styles.caption}>
        Classic scaling-law pattern: each new model in the family uses more
        training compute and delivers higher capability. Performance scores are
        approximate (AA Intelligence Index-style composite). Training FLOPs from
        Epoch AI + analyst estimates.
      </div>
    </div>
  );
}

export const WithinLabScaling = forwardRef(WithinLabScalingInner);
