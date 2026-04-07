import type { Chart as ChartJS } from 'chart.js';
import { useCallback } from 'react';

import { downloadBlob } from '@/services/export';

/** A dataset's `borderColor` can be a string, array, or a scriptable fn. */
type DatasetColor = string | readonly string[] | unknown;

export interface ChartExportOptions {
  /** Bold title drawn across the top of the composite canvas. */
  title: string;
  /** Smaller subtitle under the title. */
  subtitle?: string;
  /** Filename for the downloaded PNG. */
  filename: string;
  /** Override the default 3200px export width. */
  exportWidth?: number;
  /**
   * Temporary `devicePixelRatio` applied to the Chart.js instance for
   * the capture. Higher = sharper. Default 3 — balances quality vs the
   * very brief flash while the live chart re-renders at the bumped DPR.
   */
  captureDpr?: number;
}

/** Color-bearing legend item extracted from a chart dataset. */
interface LegendItem {
  label: string;
  color: string;
}

/**
 * Pull a usable legend from the chart's datasets.
 * Skips projection band helpers (`*-high`, `proj-*`) and trend overlays —
 * these are chart-internal rendering tricks, not legitimate legend entries.
 */
function extractLegend(chart: ChartJS): LegendItem[] {
  const items: LegendItem[] = [];
  for (const ds of chart.data.datasets) {
    const label = ds.label ?? '';
    if (
      !label ||
      label.includes(' high') ||
      label.includes('proj-') ||
      label === 'Trend' ||
      label.startsWith('Trend (')
    ) {
      continue;
    }

    const raw = (ds as { borderColor?: DatasetColor }).borderColor;
    let color: string | null = null;
    if (typeof raw === 'string') {
      color = raw;
    } else if (Array.isArray(raw) && typeof raw[0] === 'string') {
      color = raw[0];
    }
    if (!color || color === 'transparent' || color.includes('rgba(255, 255, 255')) {
      continue;
    }
    items.push({ label, color });
  }
  return items;
}

/** One frame's worth of wait — lets Chart.js finish its rAF-scheduled render. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Build a composite PNG containing: title + subtitle + legend + chart,
 * rendered on a dark background to match the dashboard's aesthetic.
 *
 * High-resolution strategy:
 *   1. Temporarily bump the live Chart.js instance's `devicePixelRatio`
 *      to `captureDpr` (default 3) and call `chart.resize()` — Chart.js
 *      re-renders the canvas backing store at 3× its CSS size.
 *   2. Wait one animation frame so the high-DPR render completes.
 *   3. Read `chart.canvas` (now at the bumped backing-store resolution)
 *      and composite it onto an export-sized canvas alongside the
 *      header text/legend drawn natively at export resolution.
 *   4. Restore the original DPR in a `finally` block so live rendering
 *      returns to normal even if the capture threw.
 *
 * Result: chart pixels are rendered fresh at ~3× resolution and the
 * header elements (title, subtitle, legend row) are drawn at the
 * composite's native resolution — both crisp at 3200px output width.
 */
async function buildCompositeCanvas(
  chart: ChartJS,
  {
    title,
    subtitle,
    exportWidth = 3200,
    captureDpr = 3,
  }: ChartExportOptions,
): Promise<HTMLCanvasElement> {
  // Snapshot the current DPR and the CSS dimensions BEFORE bumping, so
  // we can compute export sizes without mixing pre/post scales.
  const srcCanvas = chart.canvas;
  const originalDpr =
    (chart.options.devicePixelRatio as number | undefined) ??
    window.devicePixelRatio ??
    1;
  const cssW = srcCanvas.width / originalDpr;
  const cssH = srcCanvas.height / originalDpr;

  // Bump the chart's DPR for a high-res capture.
  chart.options.devicePixelRatio = captureDpr;

  try {
    // `resize()` forces Chart.js to recompute the backing store at the
    // new DPR. Wait one frame so the render completes before we read
    // from the canvas.
    chart.resize();
    await nextFrame();

    // Composite canvas dimensions.
    const scale = exportWidth / cssW;
    const exportChartH = Math.round(cssH * scale);

    // Header layout scales with `scale` so text stays proportional
    // to the chart area regardless of exportWidth.
    const pad = Math.round(24 * scale);
    const titleSize = Math.round(28 * scale);
    const subSize = Math.round(14 * scale);
    const legendSize = Math.round(14 * scale);
    const headerH =
      pad +
      titleSize +
      Math.round(8 * scale) +
      subSize +
      Math.round(16 * scale) +
      legendSize +
      Math.round(16 * scale) +
      2;

    const legendItems = extractLegend(chart);

    const comp = document.createElement('canvas');
    comp.width = exportWidth;
    comp.height = exportChartH + headerH;
    const ctx = comp.getContext('2d');
    if (!ctx) {
      throw new Error('[useChartExport] 2D canvas context unavailable');
    }
    // Enable high-quality image smoothing when we scale the source chart.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Background.
    ctx.fillStyle = '#080820';
    ctx.fillRect(0, 0, comp.width, comp.height);

    const fontStack =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    // Title.
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${titleSize}px ${fontStack}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, pad, pad + titleSize);

    // Subtitle.
    if (subtitle) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = `${subSize}px ${fontStack}`;
      ctx.fillText(
        subtitle,
        pad,
        pad + titleSize + Math.round(8 * scale) + subSize,
      );
    }

    // Legend row.
    const ly =
      pad +
      titleSize +
      Math.round(8 * scale) +
      subSize +
      Math.round(16 * scale) +
      legendSize;
    const dotR = Math.round(6 * scale);
    const dotGap = Math.round(16 * scale);
    const itemGap = Math.round(36 * scale);
    let lx = pad;
    for (const item of legendItems) {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(lx + dotR, ly - Math.round(4 * scale), dotR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = `600 ${legendSize}px ${fontStack}`;
      ctx.fillText(item.label, lx + dotGap, ly);
      lx += ctx.measureText(item.label).width + itemGap;
    }

    // Divider line above the chart area.
    const divY = headerH - 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = Math.max(1, Math.round(scale));
    ctx.beginPath();
    ctx.moveTo(pad, divY);
    ctx.lineTo(exportWidth - pad, divY);
    ctx.stroke();

    // Composite the chart canvas (now at captureDpr backing store) into
    // the export area. drawImage uses the source's full backing store,
    // so this is a high-quality resample.
    ctx.drawImage(srcCanvas, 0, headerH, exportWidth, exportChartH);

    return comp;
  } finally {
    // Always restore the original DPR, even on error. `resize()` forces
    // Chart.js to return the backing store to normal CSS-relative size.
    chart.options.devicePixelRatio = originalDpr;
    chart.resize();
  }
}

/** Convert a canvas → PNG blob via the async toBlob API. */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('canvas.toBlob returned null'));
      },
      'image/png',
      1,
    );
  });
}

/**
 * Hook that returns a stable `exportPNG` callback. Give it a Chart.js
 * instance (from `BaseChartRef`) plus title/subtitle/filename and it
 * composes and downloads a shareable high-resolution PNG.
 */
export function useChartExport() {
  return useCallback(
    async (
      chart: ChartJS | null,
      options: ChartExportOptions,
    ): Promise<void> => {
      if (!chart) {
        console.warn('[useChartExport] no chart instance provided');
        return;
      }
      const canvas = await buildCompositeCanvas(chart, options);
      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, options.filename);
    },
    [],
  );
}
