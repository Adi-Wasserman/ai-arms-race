import type {
  Chart as ChartJS,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { forwardRef, useMemo, type ForwardedRef } from 'react';

import { BaseChart } from '@/components/charts/BaseChart';

import styles from './TrainingComputeChart.module.css';

/* ─────────────────────────────────────────────────────────────
   Training Compute Growth scatter chart.

   Replaces the old "Compute vs Performance" lab-positioning
   scatter. This chart plots individual model releases against
   their estimated training FLOPs over time (log scale),
   showing the ~5×/year frontier growth trend.

   Data: Epoch AI "Compute of Frontier AI Models" + provider
   system cards + analyst estimates (SemiAnalysis, Fubon).
   ───────────────────────────────────────────────────────────── */

interface ModelPoint {
  name: string;
  lab: string;
  year: number;
  flops: number;
  color: string;
  estimated?: boolean;
}

const LAB_COLOR: Record<string, string> = {
  OpenAI: '#00ff87',
  Anthropic: '#ffaa00',
  Google: '#4285f4',
  xAI: '#ff4444',
  Meta: '#00d4ff',
  Other: '#888888',
};

const MODELS: readonly ModelPoint[] = [
  // ── Historical landmarks ──
  { name: 'GPT-3', lab: 'OpenAI', year: 2020.45, flops: 3.14e23, color: LAB_COLOR.OpenAI },
  { name: 'Gopher', lab: 'Google', year: 2021.92, flops: 5.76e23, color: LAB_COLOR.Google },
  { name: 'Chinchilla', lab: 'Google', year: 2022.25, flops: 5.76e23, color: LAB_COLOR.Google },
  { name: 'PaLM', lab: 'Google', year: 2022.33, flops: 2.5e24, color: LAB_COLOR.Google },
  { name: 'Llama 2 70B', lab: 'Meta', year: 2023.54, flops: 1e24, color: LAB_COLOR.Meta },
  { name: 'GPT-4', lab: 'OpenAI', year: 2023.21, flops: 2.1e25, color: LAB_COLOR.OpenAI },

  // ── 2024 frontier ──
  { name: 'Gemini 1.5 Pro', lab: 'Google', year: 2024.13, flops: 1.2e25, color: LAB_COLOR.Google, estimated: true },
  { name: 'Claude 3 Opus', lab: 'Anthropic', year: 2024.21, flops: 1.8e25, color: LAB_COLOR.Anthropic, estimated: true },
  { name: 'Llama 3.1 405B', lab: 'Meta', year: 2024.55, flops: 3.8e25, color: LAB_COLOR.Meta },
  { name: 'Grok 2', lab: 'xAI', year: 2024.62, flops: 8e24, color: LAB_COLOR.xAI, estimated: true },

  // ── 2025 frontier ──
  { name: 'GPT-4o', lab: 'OpenAI', year: 2025.08, flops: 6.4e25, color: LAB_COLOR.OpenAI, estimated: true },
  { name: 'Gemini 2.0 Pro', lab: 'Google', year: 2025.17, flops: 4e25, color: LAB_COLOR.Google, estimated: true },
  { name: 'Claude Opus 4', lab: 'Anthropic', year: 2025.38, flops: 8e25, color: LAB_COLOR.Anthropic, estimated: true },
  { name: 'GPT-5', lab: 'OpenAI', year: 2025.42, flops: 5e25, color: LAB_COLOR.OpenAI, estimated: true },
  { name: 'Llama 4 Behemoth', lab: 'Meta', year: 2025.25, flops: 1.2e25, color: LAB_COLOR.Meta, estimated: true },
  { name: 'Grok 3', lab: 'xAI', year: 2025.15, flops: 2.5e25, color: LAB_COLOR.xAI, estimated: true },

  // ── 2026 frontier ──
  { name: 'Gemini 3.1 Pro', lab: 'Google', year: 2026.0, flops: 1.5e26, color: LAB_COLOR.Google, estimated: true },
  { name: 'Claude Opus 4.6', lab: 'Anthropic', year: 2026.08, flops: 2e26, color: LAB_COLOR.Anthropic, estimated: true },
  { name: 'GPT-5.4', lab: 'OpenAI', year: 2026.13, flops: 1.8e26, color: LAB_COLOR.OpenAI, estimated: true },
  { name: 'Grok 4', lab: 'xAI', year: 2026.25, flops: 5e26, color: LAB_COLOR.xAI, estimated: true },
  { name: 'Muse Spark', lab: 'Meta', year: 2026.27, flops: 2e25, color: LAB_COLOR.Meta, estimated: true },
];

/**
 * Trend line: ~5×/year exponential from 2020.
 * log10(flops) = 23.5 + 0.7 * (year - 2020)
 * 10^0.7 ≈ 5.01
 */
function trendPoints(): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let yr = 2019.5; yr <= 2026.8; yr += 0.25) {
    pts.push({ x: yr, y: Math.pow(10, 23.5 + 0.7 * (yr - 2020)) });
  }
  return pts;
}

function fmtFlops(v: number): string {
  const exp = Math.floor(Math.log10(v));
  const mantissa = v / Math.pow(10, exp);
  return `${mantissa.toFixed(1)}e${exp}`;
}

interface ComputedChart {
  data: ChartData<'scatter'>;
  options: ChartOptions<'scatter'>;
  keyFinding: JSX.Element;
}

function computeChart(): ComputedChart {
  const trend = trendPoints();
  const points = MODELS.map((m) => ({
    x: m.year,
    y: m.flops,
    ...m,
  }));

  // Build unique lab legend entries
  const labsSeen = new Set<string>();
  const legendItems: { lab: string; color: string }[] = [];
  for (const m of MODELS) {
    if (!labsSeen.has(m.lab)) {
      labsSeen.add(m.lab);
      legendItems.push({ lab: m.lab, color: m.color });
    }
  }

  const data: ChartData<'scatter'> = {
    datasets: [
      {
        label: '~5×/yr trend',
        type: 'line' as const,
        data: trend,
        borderColor: 'rgba(255, 255, 255, 0.18)',
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHitRadius: 0,
        fill: false,
        showLine: true,
      } as unknown as (typeof data.datasets)[0],
      {
        label: 'Models',
        data: points,
        backgroundColor: points.map((p) => `${p.color}55`),
        borderColor: points.map((p) => p.color),
        borderWidth: 2,
        pointRadius: points.map((p) => (p.estimated ? 10 : 13)),
        pointHoverRadius: points.map((p) => (p.estimated ? 13 : 16)),
        pointStyle: points.map((p) => (p.estimated ? 'triangle' : 'circle')),
      },
    ],
  };

  // Model name annotations
  const annotations: Record<string, unknown> = {};
  // Only label a subset to avoid overlap — largest per lab-year bucket
  const labeled = new Set<string>();
  const byLabYear = new Map<string, ModelPoint>();
  for (const m of MODELS) {
    const key = `${m.lab}-${Math.round(m.year)}`;
    const existing = byLabYear.get(key);
    if (!existing || m.flops > existing.flops) byLabYear.set(key, m);
  }
  for (const m of byLabYear.values()) labeled.add(m.name);

  points.forEach((pt, i) => {
    if (!labeled.has(pt.name)) return;
    annotations[`label${i}`] = {
      type: 'label',
      xValue: pt.x,
      yValue: pt.y,
      content: [pt.name + (pt.estimated ? '*' : '')],
      color: `${pt.color}cc`,
      font: { size: 9, weight: 600 },
      position: { x: 'center', y: 'end' },
      yAdjust: -(pt.estimated ? 14 : 17),
      backgroundColor: 'transparent',
    };
  });

  const options: ChartOptions<'scatter'> = {
    layout: { padding: { top: 30, right: 20, bottom: 10, left: 10 } },
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Release Year',
          color: 'rgba(255, 255, 255, 0.35)',
          font: { size: 11 },
        },
        min: 2019.5,
        max: 2026.8,
        ticks: {
          callback: (v) => String(Math.round(v as number)),
          stepSize: 1,
        },
      },
      y: {
        type: 'logarithmic',
        title: {
          display: true,
          text: 'Training Compute (FLOPs)',
          color: 'rgba(255, 255, 255, 0.35)',
          font: { size: 11 },
        },
        min: 1e23,
        max: 1e27,
        ticks: {
          callback: (v) => {
            const val = v as number;
            const exp = Math.round(Math.log10(val));
            return `10^${exp}`;
          },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        displayColors: false,
        filter: (item) => item.datasetIndex === 1,
        callbacks: {
          title: (items) => {
            const pt = items[0]?.raw as (typeof points)[0] | undefined;
            if (!pt) return '';
            return pt.name + (pt.estimated ? ' (est.)' : '');
          },
          label: (ctx) => {
            const pt = ctx.raw as (typeof points)[0];
            return [
              `Lab: ${pt.lab}`,
              `Training compute: ${fmtFlops(pt.flops)} FLOPs`,
              `Released: ~${pt.year.toFixed(0)}`,
              ...(pt.estimated ? ['* Estimated from analyst consensus'] : []),
            ];
          },
        },
      },
      annotation: { annotations } as unknown as never,
    },
  };

  const keyFinding = (
    <>
      Frontier training compute has grown{' '}
      <strong>~5× per year</strong> since 2020. Each lab's successive
      models use substantially more FLOPs and score higher on benchmarks — this
      is the scaling laws thesis playing out in practice.{' '}
      <span className={styles.muted}>
        ● = published · ▲ = estimated · * = analyst consensus.
      </span>
    </>
  );

  return { data, options, keyFinding };
}

// eslint-disable-next-line @typescript-eslint/ban-types
type TrainingComputeChartProps = {};

function TrainingComputeChartInner(
  _props: TrainingComputeChartProps,
  ref: ForwardedRef<ChartJS<'scatter'>>,
): JSX.Element {
  const { data, options, keyFinding } = useMemo(() => computeChart(), []);

  return (
    <>
      {keyFinding && <div className={styles.keyFinding}>{keyFinding}</div>}

      <div className={styles.legend}>
        {Object.entries(LAB_COLOR).map(([lab, color]) => (
          <span key={lab} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: color }} />
            {lab === 'Google' ? 'Google DeepMind' : lab}
          </span>
        ))}
      </div>

      <div className={styles.wrapper}>
        <BaseChart<'scatter'>
          ref={ref}
          type="scatter"
          data={data}
          options={options}
          ariaLabel="Frontier training compute growth scatter chart"
        />
      </div>
    </>
  );
}

export const TrainingComputeChart = forwardRef(TrainingComputeChartInner);
