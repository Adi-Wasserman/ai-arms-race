import type { Chart as ChartJS } from 'chart.js';
import { useCallback, type RefObject } from 'react';

import { useChartExport } from '@/components/charts/useChartExport';
import { LAB_NAMES } from '@/config/labs';
import { PROJ_2029_TARGETS } from '@/data/projections';
import { downloadCSV, downloadJSON } from '@/services/export';
import { useDashboard } from '@/store';
import { activeProj, activeSeries, activeSeriesWithProj } from '@/store/selectors';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export interface UseRaceExportResult {
  exportCSV: () => void;
  exportJSON: () => void;
  exportPNG: () => Promise<void>;
}

/**
 * Section-specific exporters for THE RACE. Wraps the generic export
 * helpers in `services/export.ts` and adds the chart PNG path.
 *
 * Ported from Export.exportRaceCSV / exportRaceJSON + UI.exportRaceChartPNG
 * in ai-arms-race.html.
 */
export function useRaceExport(
  chartRef: RefObject<ChartJS<'line'> | null>,
): UseRaceExportResult {
  const exportChart = useChartExport();

  const exportCSV = useCallback((): void => {
    const state = useDashboard.getState();
    const series =
      state.projMode === '2029' ? activeSeriesWithProj(state) : activeSeries(state);

    const rows = series.map((pt) => {
      const row: Record<string, string | number> = { date: pt.date };
      for (const lab of LAB_NAMES) {
        row[`${lab}_H100e`] = pt[lab];
        row[`${lab}_MW`] = pt[`${lab}_pw`];
      }
      row.total_H100e = pt.tH;
      row.total_MW = pt.tP;
      row.scope = state.scope;
      return row;
    });

    const cols = [
      'date',
      ...LAB_NAMES.flatMap((l) => [`${l}_H100e`, `${l}_MW`]),
      'total_H100e',
      'total_MW',
      'scope',
    ];

    downloadCSV(rows, `ai-arms-race-timeseries-${TODAY_ISO}.csv`, cols);
  }, []);

  const exportJSON = useCallback((): void => {
    const state = useDashboard.getState();
    const series =
      state.projMode === '2029' ? activeSeriesWithProj(state) : activeSeries(state);
    const proj = state.projMode === '2029' ? activeProj(state) : null;

    downloadJSON(
      {
        exported: new Date().toISOString(),
        scope: state.scope,
        projection: state.projMode,
        metric: state.metric,
        labs: LAB_NAMES,
        growthAssumptions: state.projMode === '2029' ? PROJ_2029_TARGETS : null,
        timeSeries: series,
        projectionBands: proj ? { low: proj.low, high: proj.high } : null,
      },
      `ai-arms-race-timeseries-${TODAY_ISO}.json`,
    );
  }, []);

  const exportPNG = useCallback(async (): Promise<void> => {
    await exportChart(chartRef.current, {
      title: 'THE AI ARMS RACE',
      subtitle: `${TODAY_ISO} · adi-wasserman.github.io/ai-arms-race`,
      filename: `ai-arms-race-${TODAY_ISO}.png`,
    });
  }, [chartRef, exportChart]);

  return { exportCSV, exportJSON, exportPNG };
}
