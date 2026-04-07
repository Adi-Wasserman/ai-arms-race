import type {
  Chart as ChartJS,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { forwardRef, useMemo, type ForwardedRef } from 'react';

import { BaseChart } from '@/components/charts/BaseChart';
import { METR_HORIZONS } from '@/data/metr';

import styles from './MetrChart.module.css';

const DOT_COLOR = '#2d8a4e';

/** Human-readable time horizon reference tasks, pinned to Y values. */
const TASKS: readonly { h: number; text: string }[] = [
  { h: 1, text: 'Fix bugs in small Python libraries' },
  { h: 2.5, text: 'Exploit a buffer overflow in libiec61850' },
  { h: 4, text: 'Train adversarially robust image model' },
  { h: 8, text: 'Exploit a vulnerable Ethereum smart contract' },
];

/** Shape of each METR scatter point after enrichment. */
interface MetrPoint {
  x: string;
  y: number; // hours
  labelName: string;
  rawMin: number;
  showLabel: boolean;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type MetrChartProps = {};

function MetrChartInner(
  _props: MetrChartProps,
  ref: ForwardedRef<ChartJS<'scatter'>>,
): JSX.Element {
  const { data, options } = useMemo(() => {
    // Build scatter points — convert minutes to hours.
    const points: MetrPoint[] = METR_HORIZONS.map((row) => ({
      x: row[0],
      y: row[2] / 60,
      labelName: row[1],
      rawMin: row[2],
      showLabel: row[3] === 1,
    }));
    const radii = points.map((p) => (p.showLabel ? 7 : 5));

    // Exponential trend anchored at GPT-5 (Aug 2025, 137 min),
    // doubling every 150 days — matches the METR page curve.
    const anchorDate = new Date('2025-08-06').getTime();
    const anchorVal = 137 / 60;
    const doublingMs = 150 * 86_400_000;
    const trendData: { x: string; y: number }[] = [];
    for (
      let d = new Date('2019-01-01');
      d <= new Date('2027-01-01');
      d.setDate(d.getDate() + 7)
    ) {
      const elapsed = d.getTime() - anchorDate;
      const val = anchorVal * Math.pow(2, elapsed / doublingMs);
      if (val <= 16) {
        trendData.push({ x: d.toISOString().slice(0, 10), y: val });
      }
    }

    // Mixed chart — scatter points + a line overlay for the exponential
    // trend. Cast at this single boundary since Chart.js's TS types
    // don't model per-dataset type overrides.
    const chartData = {
      datasets: [
        {
          label: 'Frontier models (50% time horizon)',
          data: points,
          backgroundColor: DOT_COLOR,
          borderColor: DOT_COLOR,
          pointRadius: radii,
          pointHoverRadius: 10,
          pointHitRadius: 5,
          showLine: false,
          order: 1,
        },
        {
          label: 'Exponential trend',
          type: 'line',
          data: trendData,
          borderColor: 'rgba(45, 138, 78, 0.4)',
          borderWidth: 2.5,
          borderDash: [10, 6],
          pointRadius: 0,
          pointHoverRadius: 0,
          pointHitRadius: 0,
          showLine: true,
          fill: false,
          order: 2,
        },
      ],
    } as unknown as ChartData<'scatter'>;

    const annotations: Record<string, unknown> = {};

    // Model name labels — only the "featured" rows.
    points.forEach((pt, i) => {
      if (!pt.showLabel) return;
      const isHigh = pt.y > 3;
      annotations[`m${i}`] = {
        type: 'label',
        xValue: pt.x,
        yValue: pt.y,
        content: [pt.labelName],
        color: 'rgba(255, 255, 255, 0.8)',
        font: { size: 11, weight: 600 },
        xAdjust: 14,
        yAdjust: isHigh ? -14 : 8,
        backgroundColor: 'transparent',
        textAlign: 'left',
      };
    });

    // Task reference lines, pinned to Y-axis.
    TASKS.forEach((t, i) => {
      annotations[`tl${i}`] = {
        type: 'line',
        yMin: t.h,
        yMax: t.h,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        borderDash: [3, 3],
        label: {
          display: true,
          content: `— ${t.text}`,
          position: 'start',
          color: 'rgba(255, 255, 255, 0.35)',
          font: { size: 10 },
          backgroundColor: 'transparent',
          padding: { left: 0, right: 0, top: 0, bottom: 0 },
        },
      };
    });

    const chartOptions: ChartOptions<'scatter'> = {
      interaction: { mode: 'point', intersect: true },
      layout: { padding: { top: 10, right: 30, bottom: 10 } },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'year', displayFormats: { year: 'yyyy' } },
          min: '2019-01-01',
          max: '2026-09-01',
          ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 12 } },
        },
        y: {
          type: 'linear',
          min: -0.5,
          max: 16,
          ticks: {
            color: 'rgba(255, 255, 255, 0.45)',
            font: { size: 12, weight: 600 },
            stepSize: 1,
            callback: (v) => {
              const n = Number(v);
              if (n < 0) return '';
              if (n === 0) return '0';
              if (n === 0.5) return '30 min';
              return `${n}${n === 1 ? ' hour' : ' hours'}`;
            },
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: 'rgba(255, 255, 255, 0.4)',
            font: { size: 11 },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            filter: (item) => (item.datasetIndex ?? 0) < 2,
          },
        },
        annotation: { annotations } as unknown as never,
        tooltip: {
          enabled: true,
          filter: (item) => item.datasetIndex === 0,
          callbacks: {
            title: (items) => {
              const pt = items[0]?.raw as MetrPoint | undefined;
              return pt?.labelName ?? '';
            },
            afterTitle: (items) => {
              const pt = items[0]?.raw as MetrPoint | undefined;
              if (!pt) return '';
              const d = new Date(pt.x);
              const months = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
              ];
              return `Release: ${months[d.getMonth()]} ${d.getFullYear()}`;
            },
            label: (ctx) => {
              const pt = ctx.raw as MetrPoint;
              const m = pt.rawMin;
              let str: string;
              if (m >= 60) str = `${(m / 60).toFixed(1)} hours`;
              else if (m >= 1) str = `${Math.round(m)} minutes`;
              else str = `${Math.round(m * 60)} seconds`;
              return `Task Length: ${str}`;
            },
            afterLabel: () => 'Version: TH 1.1',
          },
        },
      },
    };

    return { data: chartData, options: chartOptions };
  }, []);

  return (
    <>
      <div className={styles.heading}>METR TIME HORIZONS</div>
      <div className={styles.subheading}>
        HOW LONG A TASK (MEASURED BY HUMAN EXPERT TIME) CAN AN AI AGENT COMPLETE
        WITH 50% RELIABILITY?
      </div>
      <div className={styles.intro}>
        AI task-completion ability is <strong>doubling roughly every 4 months</strong>.
        In early 2023, models could handle tasks taking a human ~1 minute. By early
        2026, Claude Opus 4.6 reached <strong>14.5 hours</strong> — completing work
        that would take a human expert most of two business days.
      </div>
      <div className={styles.wrapper}>
        <BaseChart<'scatter'>
          ref={ref}
          type="scatter"
          data={data}
          options={options}
          ariaLabel="METR Time Horizons scatter chart"
        />
      </div>
    </>
  );
}

export const MetrChart = forwardRef(MetrChartInner);
