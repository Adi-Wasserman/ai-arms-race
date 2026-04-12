import type {
  Chart as ChartJS,
  ChartData,
  ChartDataset,
  ChartOptions,
} from 'chart.js';
import { forwardRef, useMemo, useRef, type ForwardedRef, type RefObject } from 'react';

import { BaseChart } from '@/components/charts/BaseChart';
import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { PROJ_END } from '@/config/projections';
import { formatAxis, formatH100, formatPower } from '@/services/format';
import { activeProj, activeSeries, activeSeriesWithProj } from '@/store/selectors';
import { useDashboard } from '@/store';
import type { Lab, TimeSeriesPoint } from '@/types';

import styles from './RaceChart.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

/**
 * Chart.js line datasets default to `(number | Point | null)[]` data,
 * where `Point = { x: number; y: number }`. We use string dates for `x`
 * (parsed by the time-scale adapter at runtime) which Chart.js accepts
 * but its TS types don't model. We use `LineDataset` as an alias with
 * `unknown[]` data and cast at the single assembly boundary.
 */
type LineDataset = ChartDataset<'line', unknown[]>;
type LineChartData = ChartData<'line', unknown[]>;
type LineChartOptions = ChartOptions<'line'>;

/**
 * Safely read the parsed x value off a segment context. Chart.js types
 * it as nullable because points can be filtered out; during normal
 * rendering it's always numeric.
 */
function segX(p: { parsed: { x: number | null } }): number {
  return p.parsed.x ?? 0;
}

/**
 * External tooltip handler — ported from the legacy `chartTooltip`
 * (ai-arms-race.html lines 1866-1928), adapted to pin the box at a
 * fixed position inside the chart area instead of following the cursor.
 *
 * The legacy approach (which we replicate exactly):
 *   1. Read the date string from `dataPoints[0].raw.x` — this is the
 *      ORIGINAL object we passed into the dataset, not Chart.js's parsed
 *      timestamp.
 *   2. Look up the FULL snapshot from the source series by date —
 *      `series.find(pt => pt.date === dateSnap)`. This guarantees every
 *      lab's value comes from the same snapshot (no per-dataset drift).
 *   3. Iterate LAB_NAMES, extract h/p, sort by raw numeric value.
 *
 * Writes directly to a single <div> via innerHTML on every hover so
 * React doesn't re-render on every mousemove.
 */
function buildExternalTooltip(
  divRef: RefObject<HTMLDivElement>,
  isPower: boolean,
): NonNullable<NonNullable<LineChartOptions['plugins']>['tooltip']>['external'] {
  return (context) => {
    const div = divRef.current;
    if (!div) return;
    const tt = context.tooltip;

    if (tt.opacity === 0) {
      div.style.opacity = '0';
      return;
    }

    const dataPoints = tt.dataPoints ?? [];
    if (dataPoints.length === 0) {
      div.style.opacity = '0';
      return;
    }

    // 1. Date string from the original {x, y} object we passed in.
    //    Chart.js stores it on dp.raw — use the legacy's exact lookup.
    const firstRaw = dataPoints[0]?.raw as { x?: string } | undefined;
    const dateSnap = firstRaw?.x;
    if (!dateSnap) {
      div.style.opacity = '0';
      return;
    }

    // 2. Look up the FULL snapshot from the active series (not from the
    //    per-dataset hover values). Match the legacy logic exactly:
    //    use activeSeriesWithProj when in 2029 mode, else activeSeries.
    const state = useDashboard.getState();
    const series =
      state.projMode === '2029'
        ? activeSeriesWithProj(state)
        : activeSeries(state);
    const pt = series.find((x) => x.date === dateSnap);
    if (!pt) {
      div.style.opacity = '0';
      return;
    }

    // 3. Build per-lab rows from LAB_NAMES, filter to non-zero, sort by
    //    RAW numeric value (not formatted-string parseFloat which drops
    //    the M/K suffix and corrupts the order).
    const isPwSort = isPower;
    const rows = LAB_NAMES.map((c) => ({
      lab: c,
      h: pt[c],
      p: pt[`${c}_pw`],
    }))
      .filter((r) => r.h > 0 || r.p > 0)
      .sort((a, b) => (isPwSort ? b.p - a.p : b.h - a.h));

    // Date header.
    const dateStr = new Date(`${dateSnap}T00:00:00`).toLocaleDateString(
      undefined,
      { month: 'short', year: 'numeric' },
    );

    const rowsHtml = rows
      .map((r) => {
        const valueCell =
          `<span style="font-family:'SF Mono',Menlo,monospace;color:rgba(255,255,255,0.9);font-size:13px">${formatH100(r.h)} H100e</span>` +
          `<span style="font-family:'SF Mono',Menlo,monospace;color:rgba(255,255,255,0.55);font-size:12px;min-width:64px;text-align:right">${formatPower(r.p)}</span>`;

        return (
          `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;gap:14px">` +
          `<span style="color:${LAB_COLORS[r.lab]};font-weight:600;font-size:13px;flex:1">${r.lab}</span>` +
          valueCell +
          `</div>`
        );
      })
      .join('');

    const totalHtml =
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0 0;margin-top:5px;border-top:1px solid rgba(255,255,255,0.1);gap:14px">` +
      `<span style="color:rgba(255,255,255,0.55);font-weight:600;font-size:12px;letter-spacing:0.5px;flex:1">TOTAL</span>` +
      `<span style="font-family:'SF Mono',Menlo,monospace;color:#fff;font-size:13px;font-weight:700">${formatH100(pt.tH)} H100e</span>` +
      `<span style="font-family:'SF Mono',Menlo,monospace;color:rgba(255,255,255,0.7);font-size:12px;min-width:64px;text-align:right">${formatPower(pt.tP)}</span>` +
      `</div>`;

    div.innerHTML =
      `<div style="color:#fff;font-size:14px;font-weight:700;letter-spacing:0.5px;margin-bottom:7px;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,0.12)">${dateStr}</div>` +
      rowsHtml +
      totalHtml;

    div.style.opacity = '1';
  };
}

/** Extract per-lab datasets for a standard (non-projection) series. */
function buildAbsoluteDatasets(
  d: TimeSeriesPoint[],
  activeLabs: readonly Lab[],
  isPower: boolean,
  todayMs: number,
): LineDataset[] {
  return activeLabs.map((c) => ({
    label: c,
    data: d.map((x) => ({ x: x.date, y: isPower ? x[`${c}_pw`] : x[c] })) as unknown[],
    borderColor: LAB_COLORS[c],
    backgroundColor: 'transparent',
    borderWidth: 1.8,
    pointRadius: 0,
    pointHitRadius: 8,
    stepped: 'after',
    fill: false,
    segment: {
      borderDash: (ctx) => (segX(ctx.p0) >= todayMs ? [6, 4] : []),
    },
  }));
}

/** 2029 mode: main line + uncertainty fill band per lab. */
function buildProjectionDatasets(
  d: TimeSeriesPoint[],
  activeLabs: readonly Lab[],
  isPower: boolean,
  todayMs: number,
  lastBaseMs: number,
  proj: ReturnType<typeof activeProj>,
  lastBasePoint: TimeSeriesPoint | null,
): LineDataset[] {
  const datasets: LineDataset[] = [];
  const valueOf = (pt: TimeSeriesPoint, c: Lab): number =>
    isPower ? pt[`${c}_pw`] : pt[c];

  for (const c of activeLabs) {
    const color = LAB_COLORS[c];

    if (proj.high.length > 0) {
      const bandStart = lastBasePoint
        ? { x: lastBasePoint.date, y: valueOf(lastBasePoint, c) }
        : null;
      const highPts = proj.high.map((x) => ({ x: x.date, y: valueOf(x, c) }));
      const lowPts = proj.low.map((x) => ({ x: x.date, y: valueOf(x, c) }));
      if (bandStart) {
        highPts.unshift(bandStart);
        lowPts.unshift(bandStart);
      }

      datasets.push({
        label: `${c} proj-high`,
        data: highPts as unknown[],
        borderColor: 'transparent',
        borderWidth: 0,
        pointRadius: 0,
        pointHitRadius: 0,
        stepped: false,
        fill: '+1',
        backgroundColor: `${color}12`,
      });
      datasets.push({
        label: `${c} proj-low`,
        data: lowPts as unknown[],
        borderColor: 'transparent',
        borderWidth: 0,
        pointRadius: 0,
        pointHitRadius: 0,
        stepped: false,
        fill: false,
      });
    }

    datasets.push({
      label: c,
      data: d.map((x) => ({ x: x.date, y: valueOf(x, c) })) as unknown[],
      borderColor: color,
      backgroundColor: 'transparent',
      borderWidth: 1.8,
      pointRadius: 0,
      pointHitRadius: 8,
      stepped: 'after',
      fill: false,
      segment: {
        borderDash: (ctx) => {
          const xVal = segX(ctx.p0);
          if (xVal >= lastBaseMs) return [3, 3];
          if (xVal >= todayMs) return [6, 4];
          return [];
        },
        borderWidth: (ctx) => (segX(ctx.p0) >= lastBaseMs ? 2.2 : 1.8),
      },
    });
  }

  return datasets;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type RaceChartProps = {};

function RaceChartInner(
  _props: RaceChartProps,
  ref: ForwardedRef<ChartJS<'line'>>,
): JSX.Element {
  const metric = useDashboard((s) => s.metric);
  const scope = useDashboard((s) => s.scope);
  const projMode = useDashboard((s) => s.projMode);
  const dataVersion = useDashboard((s) => s.dataVersion);

  /** Stable ref to the pinned-tooltip DOM element. */
  const tooltipDivRef = useRef<HTMLDivElement>(null);

  const { data, options } = useMemo<{
    data: LineChartData;
    options: LineChartOptions;
  }>(() => {
    const state = useDashboard.getState();
    const is2029 = projMode === '2029';
    const isPower = metric === 'power';
    const todayMs = new Date(`${TODAY_ISO}T00:00:00`).getTime();

    const full = is2029 ? activeSeriesWithProj(state) : activeSeries(state);
    const d = full.filter((x) => x.date >= '2024-01-01');

    if (d.length === 0) {
      return { data: { datasets: [] }, options: {} };
    }

    const maxDate = d[d.length - 1].date;
    const baseSeries = activeSeries(state);
    const lastBaseDate =
      baseSeries.length > 0 ? baseSeries[baseSeries.length - 1].date : TODAY_ISO;
    const lastBaseMs = new Date(`${lastBaseDate}T00:00:00`).getTime();
    const lastBasePoint = baseSeries.length > 0 ? baseSeries[baseSeries.length - 1] : null;

    const activeLabs = LAB_NAMES.filter((c) =>
      d.some((x) => (isPower ? x[`${c}_pw`] : x[c]) > 0),
    );

    // ── ABSOLUTE / 2029 MODE ─────────────────────────────────
    const datasets = is2029
      ? buildProjectionDatasets(
          d,
          activeLabs,
          isPower,
          todayMs,
          lastBaseMs,
          activeProj(state),
          lastBasePoint,
        )
      : buildAbsoluteDatasets(d, activeLabs, isPower, todayMs);

    const absOptions: LineChartOptions = {
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'quarter',
            displayFormats: { quarter: 'MMM yy' },
          },
          ticks: { maxTicksLimit: is2029 ? 16 : 12 },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) =>
              isPower ? formatAxis(Number(v)) : formatH100(Number(v)),
          },
          title: {
            display: true,
            text: isPower ? 'Power' : 'H100 Equiv.',
            color: 'rgba(255, 255, 255, 0.2)',
            font: { size: 10 },
          },
        },
      },
      plugins: {
        tooltip: {
          enabled: false,
          external: buildExternalTooltip(tooltipDivRef, isPower),
        },
        annotation: {
          annotations: {
            today: {
              type: 'line',
              scaleID: 'x',
              value: TODAY_ISO,
              borderColor: 'rgba(255, 255, 255, 0.4)',
              borderWidth: 1.5,
              borderDash: [5, 4],
              label: {
                display: true,
                content: 'TODAY',
                position: 'start',
                color: 'rgba(255, 255, 255, 0.6)',
                font: { size: 10, weight: 'bold' },
                backgroundColor: 'rgba(5, 5, 16, 0.85)',
                padding: 4,
                borderRadius: 4,
              },
            },
            projZone: {
              type: 'box',
              xMin: TODAY_ISO,
              xMax: is2029 ? lastBaseDate : maxDate,
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              borderWidth: 0,
            },
            ...(is2029
              ? {
                  projZone2029: {
                    type: 'box',
                    xMin: lastBaseDate,
                    xMax: PROJ_END,
                    backgroundColor: 'rgba(255, 170, 0, 0.02)',
                    borderWidth: 0,
                  },
                  proj2029Line: {
                    type: 'line',
                    scaleID: 'x',
                    value: PROJ_END,
                    borderColor: 'rgba(255, 170, 0, 0.35)',
                    borderWidth: 1.5,
                    borderDash: [3, 3],
                    label: {
                      display: true,
                      content: 'JAN 2029',
                      position: 'start',
                      color: 'rgba(255, 170, 0, 0.7)',
                      font: { size: 10, weight: 'bold' },
                      backgroundColor: 'rgba(5, 5, 16, 0.85)',
                      padding: 4,
                      borderRadius: 4,
                    },
                  },
                  projStartLine: {
                    type: 'line',
                    scaleID: 'x',
                    value: lastBaseDate,
                    borderColor: 'rgba(255, 170, 0, 0.2)',
                    borderWidth: 1,
                    borderDash: [2, 3],
                  },
                }
              : {}),
          },
        },
      },
    };

    return { data: { datasets }, options: absOptions };
    // dataVersion drives recompute when the store swaps in fresh Epoch data.
  }, [metric, scope, projMode, dataVersion]);

  return (
    <div className={styles.wrapper}>
      <BaseChart<'line'>
        ref={ref}
        type="line"
        // Cast through unknown — our datasets use `{x: string, y: number}`
        // which Chart.js parses via the time adapter at runtime, but its
        // TS types only model the numeric `Point` form.
        data={data as unknown as ChartData<'line'>}
        options={options}
        ariaLabel="AI compute race time series"
      />
      <div ref={tooltipDivRef} className={styles.pinnedTooltip} aria-hidden />
    </div>
  );
}

export const RaceChart = forwardRef(RaceChartInner);
