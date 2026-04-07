import type { Chart as ChartJS } from 'chart.js';
import { useCallback, type RefObject } from 'react';

import { useChartExport } from '@/components/charts/useChartExport';
import { LAB_NAMES } from '@/config/labs';
import { PROJ_2029_TARGETS } from '@/data/projections';
import { downloadCSV, downloadJSON } from '@/services/export';
import { useDashboard } from '@/store';
import { activeProj, activeSeries, activeSeriesWithProj } from '@/store/selectors';
import { OWNER_TO_LAB } from '@/types';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export interface UseRaceExportResult {
  /** Time-series CSV (effective fleet view). */
  exportCSV: () => void;
  /** Time-series JSON (effective fleet view). */
  exportJSON: () => void;
  /** Composite PNG of the race chart (effective fleet view). */
  exportPNG: () => Promise<void>;
  /** Per-owner CSV from the live Epoch chip-owners snapshot. */
  exportOwnershipCSV: () => void;
  /** Per-owner JSON + metadata from the live Epoch chip-owners snapshot. */
  exportOwnershipJSON: () => void;
}

/**
 * Section-specific exporters for THE RACE.
 *
 * The hook returns five callbacks: three for the existing time-series
 * (CSV / JSON / PNG) and two for the new ownership view (CSV / JSON
 * sourced from `useEpochChipOwners`).
 *
 * The component decides which set to wire into the ExportMenu based on
 * `raceMode`. PNG is intentionally absent from the ownership branch —
 * there's no chart to capture in that view.
 */
export function useRaceExport(
  chartRef: RefObject<ChartJS<'line'> | null>,
): UseRaceExportResult {
  const exportChart = useChartExport();

  /* ─── Effective-fleet (time-series) exports ─── */

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

  /* ─── Ownership (Epoch chip-owners) exports ─── */

  const exportOwnershipCSV = useCallback((): void => {
    const state = useDashboard.getState();
    const data = state.chipOwners;
    if (!data) {
      console.warn('[useRaceExport] No chip-owners data loaded yet');
      return;
    }

    const totalH100e =
      data.latestByOwner.reduce((s, x) => s + x.h100e, 0) || 1;

    const rows = data.latestByOwner.map((s, i) => {
      const mappedLab = OWNER_TO_LAB[s.owner as keyof typeof OWNER_TO_LAB] ?? '';
      const proj = mappedLab ? PROJ_2029_TARGETS[mappedLab]?.h ?? '' : '';
      const chipMix = s.byChipType
        .map((c) => `${c.chipType}:${Math.round(c.h100e)}`)
        .join(';');
      return {
        rank: i + 1,
        owner: s.owner,
        mapped_lab: mappedLab,
        as_of: s.asOf,
        h100e_median: s.h100e,
        h100e_p5: s.h100eLow,
        h100e_p95: s.h100eHigh,
        units_median: s.units,
        power_gw: Number((s.powerMw / 1000).toFixed(3)),
        pct_global: Number(((s.h100e / totalH100e) * 100).toFixed(2)),
        chip_mix: chipMix,
        proj_2029_h100e: proj,
      };
    });

    const cols = [
      'rank',
      'owner',
      'mapped_lab',
      'as_of',
      'h100e_median',
      'h100e_p5',
      'h100e_p95',
      'units_median',
      'power_gw',
      'pct_global',
      'chip_mix',
      'proj_2029_h100e',
    ];

    downloadCSV(rows, `ai-arms-race-ownership-${TODAY_ISO}.csv`, cols);
  }, []);

  const exportOwnershipJSON = useCallback((): void => {
    const state = useDashboard.getState();
    const data = state.chipOwners;
    if (!data) {
      console.warn('[useRaceExport] No chip-owners data loaded yet');
      return;
    }

    downloadJSON(
      {
        exported: new Date().toISOString(),
        source: 'https://epoch.ai/data/ai_chip_owners.zip',
        sourceFetchedAt: data.fetchedAt,
        zipBytes: data.zipBytes,
        asOf: data.asOf,
        ownerToLab: OWNER_TO_LAB,
        owners: data.owners,
        chipTypes: data.chipTypes,
        manufacturers: data.manufacturers,
        latestByOwner: data.latestByOwner,
        timeseries: data.timeseries,
        // Caller can rebuild the table from latestByOwner; the raw
        // CSV rows are also embedded for full provenance.
        rawCumulativeByDesigner: data.cumulativeByDesigner,
        rawQuartersByChipType: data.quartersByChipType,
        rawCumulativeByChipType: data.cumulativeByChipType,
      },
      `ai-arms-race-ownership-${TODAY_ISO}.json`,
    );
  }, []);

  return {
    exportCSV,
    exportJSON,
    exportPNG,
    exportOwnershipCSV,
    exportOwnershipJSON,
  };
}
