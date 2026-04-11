import type { Chart as ChartJS } from 'chart.js';
import { useCallback, type RefObject } from 'react';

import { useChartExport } from '@/components/charts/useChartExport';
import { BENCHMARK_META, DOMAIN_GROUPS } from '@/config/benchmarks';
import { MODEL_SPECS } from '@/data/models';
import { downloadCSV } from '@/services/export';
import type { BenchmarkKey } from '@/types';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export interface UseModelsExportResult {
  exportBenchmarksCSV: () => void;
  exportComputePNG: () => Promise<void>;
  exportMetrPNG: () => Promise<void>;
}

/**
 * Section-specific exporters for MODELS.
 * Ported from Export.exportModelsCSV + UI.exportScatterPNG / exportMetrPNG
 * in ai-arms-race.html.
 */
export function useModelsExport(
  scatterRef: RefObject<ChartJS<'scatter'> | null>,
  metrRef: RefObject<ChartJS<'scatter'> | null>,
): UseModelsExportResult {
  const exportChart = useChartExport();

  const exportBenchmarksCSV = useCallback((): void => {
    // All benchmark keys across every domain, deduped in declaration order.
    const benchKeys: BenchmarkKey[] = [];
    const seen = new Set<BenchmarkKey>();
    for (const d of DOMAIN_GROUPS) {
      for (const bk of d.benchmarks) {
        if (!seen.has(bk)) {
          seen.add(bk);
          benchKeys.push(bk);
        }
      }
    }

    const rows = MODEL_SPECS.map((m) => {
      const row: Record<string, string | number | null> = {
        model: m.name,
        lab: m.lab,
        released: m.released,
        aa_index: m.aaIndex,
      };
      for (const bk of benchKeys) {
        const label = BENCHMARK_META[bk]?.label ?? bk;
        row[label] = m[bk];
      }
      row.speed_tps = m.speed;
      row.cost_in = m.costIn;
      row.cost_out = m.costOut;
      row.context_k = m.context;
      return row;
    });

    const cols = [
      'model',
      'lab',
      'released',
      'aa_index',
      ...benchKeys.map((bk) => BENCHMARK_META[bk]?.label ?? bk),
      'speed_tps',
      'cost_in',
      'cost_out',
      'context_k',
    ];

    downloadCSV(rows, `ai-arms-race-models-${TODAY_ISO}.csv`, cols);
  }, []);

  const exportComputePNG = useCallback(async (): Promise<void> => {
    await exportChart(scatterRef.current, {
      title: 'FRONTIER TRAINING COMPUTE GROWTH',
      subtitle: `${TODAY_ISO} · ~5× per year since 2020 (Epoch AI)`,
      filename: `ai-arms-race-training-compute-${TODAY_ISO}.png`,
    });
  }, [scatterRef, exportChart]);

  const exportMetrPNG = useCallback(async (): Promise<void> => {
    await exportChart(metrRef.current, {
      title: 'METR TIME HORIZONS',
      subtitle: `${TODAY_ISO} · 50% task-completion time horizon`,
      filename: `ai-arms-race-metr-${TODAY_ISO}.png`,
    });
  }, [metrRef, exportChart]);

  return { exportBenchmarksCSV, exportComputePNG, exportMetrPNG };
}
