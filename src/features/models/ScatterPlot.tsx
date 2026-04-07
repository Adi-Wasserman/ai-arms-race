import type {
  Chart as ChartJS,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { forwardRef, useMemo, type ForwardedRef } from 'react';

import { BaseChart } from '@/components/charts/BaseChart';
import { BENCHMARK_META, DOMAIN_GROUPS } from '@/config/benchmarks';
import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { MODEL_SPECS } from '@/data/models';
import { formatH100, formatPower } from '@/services/format';
import { useDashboard } from '@/store';
import { activeProj, activeSeries } from '@/store/selectors';
import type { Lab, Model, TimeSeriesPoint } from '@/types';

import styles from './ScatterPlot.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

/** Per-bubble data — what we need at paint + tooltip time. */
interface ScatterPoint {
  x: number; // H100e in millions
  y: number; // AA Index
  r: number; // radius (scaled from GW)
  lab: Lab;
  color: string;
  modelName: string;
  wins: number;
  capPerGW: string;
  hRaw: number;
  pRaw: number;
  est: boolean;
}

/** Simple linear regression. Returns slope + intercept + R². */
function linearRegression(
  xs: readonly number[],
  ys: readonly number[],
): { slope: number; intercept: number; r2: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  const ssTot = ys.reduce((a, y) => a + (y - meanY) * (y - meanY), 0);
  const ssRes = xs.reduce((a, x, i) => {
    const pred = intercept + slope * x;
    return a + (ys[i] - pred) * (ys[i] - pred);
  }, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

/** Count benchmark wins for a given model across all domain benchmarks. */
function countWins(model: Model, allModels: readonly Model[]): number {
  let wins = 0;
  for (const d of DOMAIN_GROUPS) {
    for (const bk of d.benchmarks) {
      const scores = allModels
        .map((m) => m[bk])
        .filter((v): v is number => v != null);
      if (scores.length === 0) continue;
      const maxScore = Math.max(...scores);
      if (model[bk] === maxScore) wins++;
    }
  }
  return wins;
}

interface ComputedScatter {
  points: ScatterPoint[];
  trendLine: { x: number; y: number }[];
  rSquared: string;
  maxY: number;
  keyFinding: JSX.Element | null;
}

function computeScatter(
  isProjected: boolean,
  dataPt: TimeSeriesPoint | null,
): ComputedScatter {
  if (!dataPt) {
    return {
      points: [],
      trendLine: [],
      rSquared: 'N/A',
      maxY: 70,
      keyFinding: null,
    };
  }

  // AA Index per lab — use published scores, estimate the rest.
  const aaByLab: Partial<Record<Lab, number>> = {};
  const estByLab: Partial<Record<Lab, boolean>> = {};
  for (const m of MODEL_SPECS) {
    if (m.aaIndex != null && !(m.lab in aaByLab)) {
      aaByLab[m.lab] = m.aaIndex;
      estByLab[m.lab] = false;
    }
  }
  // Analyst-consensus estimates for labs with no published AA Index.
  if (aaByLab.xAI == null) {
    aaByLab.xAI = 45;
    estByLab.xAI = true;
  }
  if (aaByLab.Meta == null) {
    aaByLab.Meta = 30;
    estByLab.Meta = true;
  }

  // Projected view: modest ~8%/yr AA improvement over 2.75 years.
  if (isProjected) {
    const aaGrowth = Math.pow(1.08, 2.75);
    for (const lab of LAB_NAMES) {
      if (aaByLab[lab] != null) {
        aaByLab[lab] = Math.round(aaByLab[lab]! * aaGrowth * 10) / 10;
      }
    }
  }

  const points: ScatterPoint[] = [];
  const trendX: number[] = [];
  const trendY: number[] = [];

  for (const lab of LAB_NAMES) {
    const h = dataPt[lab];
    const p = dataPt[`${lab}_pw`];
    const aa = aaByLab[lab];
    if (!h || aa == null) continue;

    const hM = h / 1e6;
    const pGW = p / 1000;
    const capPerGW = p > 0 ? ((aa / p) * 1000).toFixed(1) : '—';

    const model = MODEL_SPECS.find((m) => m.lab === lab) ?? null;
    const modelName = model?.name ?? lab;
    const wins = model ? countWins(model, MODEL_SPECS) : 0;

    points.push({
      x: hM,
      y: aa,
      r: Math.max(8, Math.min(35, pGW * 18 + 6)),
      lab,
      color: LAB_COLORS[lab],
      modelName,
      wins,
      capPerGW,
      hRaw: h,
      pRaw: p,
      est: estByLab[lab] === true,
    });
    trendX.push(hM);
    trendY.push(aa);
  }

  if (points.length === 0) {
    return {
      points: [],
      trendLine: [],
      rSquared: 'N/A',
      maxY: isProjected ? 90 : 70,
      keyFinding: null,
    };
  }

  const { slope, intercept, r2 } = linearRegression(trendX, trendY);
  const rSquared = Number.isFinite(r2) ? r2.toFixed(2) : 'N/A';
  const xMin = 0;
  const xMax = Math.max(...trendX) * 1.15;
  const trendLine = [
    { x: xMin, y: intercept + slope * xMin },
    { x: xMax, y: intercept + slope * xMax },
  ];

  // Key finding — most vs least efficient lab.
  const sorted = [...points].sort((a, b) => b.y / (b.x || 1) - a.y / (a.x || 1));
  const mostEff = sorted[0];
  const leastEff = sorted[sorted.length - 1];
  const view = isProjected ? 'By Jan 2029' : 'Today';

  const keyFinding = (
    <>
      {view},{' '}
      <strong style={{ color: mostEff.color }}>{mostEff.lab}</strong> extracts the
      most intelligence per H100e{mostEff.est ? ' (est.)' : ''}, while{' '}
      <strong style={{ color: leastEff.color }}>{leastEff.lab}</strong> has the most
      compute but lower efficiency. R² = <strong>{rSquared}</strong> — compute
      explains some but not all of model quality.{' '}
      <span className={styles.muted}>
        Bubble size = power footprint (GW).
      </span>
    </>
  );

  return {
    points,
    trendLine,
    rSquared,
    maxY: isProjected ? 90 : 70,
    keyFinding,
  };
}

// eslint-disable-next-line @typescript-eslint/ban-types
type ScatterPlotProps = {};

function ScatterPlotInner(
  _props: ScatterPlotProps,
  ref: ForwardedRef<ChartJS<'scatter'>>,
): JSX.Element {
  const scatterView = useDashboard((s) => s.scatterView);
  const scope = useDashboard((s) => s.scope);
  const dataVersion = useDashboard((s) => s.dataVersion);

  const { data, options, keyFinding } = useMemo(() => {
    const state = useDashboard.getState();
    const isProjected = scatterView === 'projected';

    const series = activeSeries(state);
    const past = series.filter((x) => x.date <= TODAY_ISO);
    const current = past.length > 0 ? past[past.length - 1] : null;

    let dataPt: TimeSeriesPoint | null = current;
    if (isProjected) {
      const proj = activeProj(state);
      if (proj.central.length > 0) {
        dataPt = proj.central[proj.central.length - 1];
      }
    }

    const computed = computeScatter(isProjected, dataPt);

    // Mixed chart: scatter bubbles + line trend overlay. Chart.js
    // supports `type: 'line'` on individual datasets in a scatter
    // chart, but the TS types don't model per-dataset type overrides.
    // Cast the datasets at this single boundary.
    const chartData = {
      datasets: [
        {
          label: `Trend (R²=${computed.rSquared})`,
          type: 'line',
          data: computed.trendLine,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHitRadius: 0,
          fill: false,
          showLine: true,
        },
        {
          label: 'Labs',
          data: computed.points,
          backgroundColor: computed.points.map((p) => `${p.color}55`),
          borderColor: computed.points.map((p) => p.color),
          borderWidth: 2,
          pointRadius: computed.points.map((p) => p.r),
          pointHoverRadius: computed.points.map((p) => p.r + 3),
          pointStyle: 'circle',
        },
      ],
    } as unknown as ChartData<'scatter'>;

    const annotations: Record<string, unknown> = {};
    computed.points.forEach((pt, i) => {
      annotations[`label${i}`] = {
        type: 'label',
        xValue: pt.x,
        yValue: pt.y,
        content: [pt.lab + (pt.est ? '*' : '')],
        color: pt.color,
        font: { size: 10, weight: 600 },
        position: { x: 'center', y: 'end' },
        yAdjust: -(pt.r + 6),
        backgroundColor: 'transparent',
      };
    });

    const chartOptions: ChartOptions<'scatter'> = {
      layout: { padding: { top: 30, right: 40, bottom: 10, left: 10 } },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Compute Capacity (Millions H100e)',
            color: 'rgba(255, 255, 255, 0.35)',
            font: { size: 11 },
          },
          ticks: {
            callback: (v) => `${v}M`,
          },
          min: 0,
        },
        y: {
          title: {
            display: true,
            text: 'AA Intelligence Index',
            color: 'rgba(255, 255, 255, 0.35)',
            font: { size: 11 },
          },
          min: 20,
          max: computed.maxY,
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
              const pt = items[0]?.raw as ScatterPoint | undefined;
              if (!pt) return '';
              return pt.modelName + (pt.est ? ' (est.)' : '');
            },
            label: (ctx) => {
              const pt = ctx.raw as ScatterPoint;
              return [
                `Lab: ${pt.lab}`,
                `Compute: ${formatH100(pt.hRaw)} H100e`,
                `Power: ${formatPower(pt.pRaw)}`,
                `AA Index: ${pt.y}${pt.est ? ' (estimated)' : ''}`,
                `Benchmark wins: ${pt.wins}`,
                `AA / GW: ${pt.capPerGW}`,
              ];
            },
          },
        },
        // Annotations are a string-keyed record — the Chart.js TS types
        // require a deeply-specific union we don't mirror at this layer.
        annotation: { annotations } as unknown as never,
      },
    };

    return { data: chartData, options: chartOptions, keyFinding: computed.keyFinding };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scatterView, scope, dataVersion]);

  return (
    <>
      {keyFinding && <div className={styles.keyFinding}>{keyFinding}</div>}
      <div className={styles.wrapper}>
        <BaseChart<'scatter'>
          ref={ref}
          type="scatter"
          data={data}
          options={options}
          ariaLabel="Compute vs Performance scatter chart"
        />
      </div>
    </>
  );
}

void BENCHMARK_META; // imported for side-effects in the future

export const ScatterPlot = forwardRef(ScatterPlotInner);
