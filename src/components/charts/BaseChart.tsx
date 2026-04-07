import 'chartjs-adapter-date-fns';

import {
  BarController,
  BarElement,
  BubbleController,
  CategoryScale,
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  type ChartType,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  LogarithmicScale,
  PointElement,
  ScatterController,
  TimeScale,
  Title,
  Tooltip,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { forwardRef, type ForwardedRef, useMemo } from 'react';
import { Chart } from 'react-chartjs-2';

import styles from './BaseChart.module.css';

/* ─────────────────────────────────────────────────────────────
   One-time Chart.js registration. Runs when this module is
   imported — keeps per-chart boilerplate out of feature code.
   ───────────────────────────────────────────────────────────── */

ChartJS.register(
  // Controllers — required for each chart `type` we use. Chart.js v4
  // no longer auto-registers these; omitting them blows up at first
  // render with "<type> is not a registered controller" — and only in
  // production builds (dev has looser linking that masks the issue).
  LineController,
  ScatterController,
  BarController,
  BubbleController,
  // Scales
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  TimeScale,
  // Elements
  PointElement,
  LineElement,
  BarElement,
  // Plugins
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
);

/* ─────────────────────────────────────────────────────────────
   Dark-theme defaults — ported from the inline options blocks
   in ai-arms-race.html (lines 2027-2053, 2138-2150, etc).
   Applied globally so every chart in the app inherits them.
   ───────────────────────────────────────────────────────────── */

ChartJS.defaults.color = 'rgba(255, 255, 255, 0.3)';
ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.04)';
ChartJS.defaults.font.family =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
ChartJS.defaults.font.size = 10;

// Tooltip — dark popup look matching the legacy chartTooltip styling.
ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(8, 8, 28, 0.96)';
ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.12)';
ChartJS.defaults.plugins.tooltip.borderWidth = 1;
ChartJS.defaults.plugins.tooltip.titleColor = '#ffffff';
ChartJS.defaults.plugins.tooltip.bodyColor = 'rgba(255, 255, 255, 0.7)';
ChartJS.defaults.plugins.tooltip.padding = 10;
ChartJS.defaults.plugins.tooltip.cornerRadius = 8;
ChartJS.defaults.plugins.tooltip.displayColors = true;

// Legend — hidden by default (the dashboard builds its own legend
// elements as HTML so hover behavior can be wired into the store).
ChartJS.defaults.plugins.legend.display = false;

/** Axis defaults re-used by the options merge below. */
const AXIS_DEFAULTS = {
  grid: { color: 'rgba(255, 255, 255, 0.04)' },
  ticks: {
    color: 'rgba(255, 255, 255, 0.3)',
    font: { size: 10 },
  },
} as const;

/* ─────────────────────────────────────────────────────────────
   Props + options merge
   ───────────────────────────────────────────────────────────── */

export interface BaseChartProps<TType extends ChartType> {
  type: TType;
  data: ChartData<TType>;
  /** Chart-specific options, deep-merged onto the dark theme defaults. */
  options?: ChartOptions<TType>;
  className?: string;
  /** Accessible label for the chart container. */
  ariaLabel?: string;
}

/**
 * Deep-merge the two scale-axis defaults onto whatever options the
 * caller passes. Keeps Chart.js from requiring every chart to re-spec
 * grid/ticks colors. Non-scale options are left to Chart.js's own
 * default resolution (which reads `ChartJS.defaults`).
 */
function mergeOptions<TType extends ChartType>(
  options: ChartOptions<TType> | undefined,
): ChartOptions<TType> {
  // Cast through unknown — ChartOptions<TType> is generic and TS can't
  // prove `responsive` / `maintainAspectRatio` exist on every chart type,
  // though in practice they do on every type we use.
  const merged = {
    responsive: true,
    maintainAspectRatio: false,
    ...options,
  } as ChartOptions<TType>;

  // Axis defaults are only meaningful when `scales` is present at all.
  if (options?.scales) {
    const mergedScales: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(options.scales)) {
      if (value && typeof value === 'object') {
        const v = value as Record<string, unknown>;
        mergedScales[key] = {
          ...v,
          grid: { ...AXIS_DEFAULTS.grid, ...(v.grid as object | undefined) },
          ticks: { ...AXIS_DEFAULTS.ticks, ...(v.ticks as object | undefined) },
        };
      } else {
        mergedScales[key] = value;
      }
    }
    // Cast back through unknown to satisfy the generic ChartOptions constraint.
    (merged as { scales?: unknown }).scales = mergedScales;
  }

  return merged;
}

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */

/** Type-safe ref to the Chart.js instance powering the <BaseChart>. */
export type BaseChartRef<TType extends ChartType = ChartType> = ChartJS<TType> | null;

function BaseChartInner<TType extends ChartType>(
  { type, data, options, className, ariaLabel }: BaseChartProps<TType>,
  ref: ForwardedRef<ChartJS<TType>>,
): JSX.Element {
  const mergedOptions = useMemo(() => mergeOptions<TType>(options), [options]);

  return (
    <div
      className={`${styles.container}${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
    >
      <Chart<TType>
        // react-chartjs-2 types the ref as `ChartJSOrUndefined` (ChartJS
        // | undefined). Our public ref type is `ChartJS | null`. Runtime-
        // equivalent, but Ref<T> is contravariant so TS can't bridge
        // them. The public BaseChart ref type stays strict; only this
        // internal boundary uses `any`.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={ref as any}
        type={type}
        data={data}
        options={mergedOptions}
      />
    </div>
  );
}

/**
 * Thin wrapper around react-chartjs-2 that applies the dashboard's
 * dark theme defaults and forwards a ref to the underlying Chart.js
 * instance (needed by `useChartExport` for PNG composition).
 */
export const BaseChart = forwardRef(BaseChartInner) as <TType extends ChartType>(
  props: BaseChartProps<TType> & { ref?: ForwardedRef<ChartJS<TType>> },
) => JSX.Element;

/** Re-export the ChartJS type so features can declare refs without pulling chart.js. */
export type { ChartJS };
