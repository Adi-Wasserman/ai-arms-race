import { useEffect, useRef } from 'react';

import { LAB_NAMES } from '@/config/labs';
import { FLEET_ESTIMATES } from '@/data/fleet';
import { LAB_MAP } from '@/data/facilities';
import { RAW_TIMELINE } from '@/data/timeline';
import { buildFallbackData, fetchEpoch, parseEpochData } from '@/services/epoch';
import { buildTimeSeries } from '@/services/timeseries';
import { useDashboard, type DataPayload } from '@/store';
import type { EpochDataEntry, EpochParsedData } from '@/types';

/**
 * Convert the fleet tuples (`[date, handle, h100e, powerMW]`) into entries
 * that `buildTimeSeries` consumes. `LAB_MAP` already contains the EAI-* +
 * EGC handles so no extra mapping is needed.
 */
function fleetAsEntries(): EpochDataEntry[] {
  return FLEET_ESTIMATES.map((r) => ({ date: r[0], dc: r[1], h: r[2], p: r[3] }));
}

/**
 * Build both series variants from a parsed dataset.
 *   seriesEpoch = satellite-verified (Epoch entries only)
 *   seriesFull  = satellite-verified + cloud-lease fleet overlay
 */
function buildBothSeries(parsed: EpochParsedData): {
  seriesEpoch: DataPayload['seriesEpoch'];
  seriesFull: DataPayload['seriesFull'];
} {
  const seriesEpoch = buildTimeSeries(parsed.entries, parsed.labMap, LAB_NAMES);

  const fullEntries = parsed.entries.concat(fleetAsEntries());
  const seriesFull = buildTimeSeries(fullEntries, parsed.labMap, LAB_NAMES);

  return { seriesEpoch, seriesFull };
}

/** Public return shape. */
export interface UseEpochDataResult {
  loading: boolean;
  error: string | null;
  /** True if the dashboard is currently showing the hardcoded fallback data. */
  stale: boolean;
}

/**
 * Fetch the Epoch AI data center + timeline CSVs, parse them, build both
 * series variants, and hydrate the dashboard store. On any failure falls
 * back to the hardcoded dataset in `src/data/`.
 *
 * Runs exactly once on mount — guarded by a ref to survive React 18
 * StrictMode's double-invocation in development.
 */
export function useEpochData(): UseEpochDataResult {
  const loading = useDashboard((s) => s.loading);
  const error = useDashboard((s) => s.error);
  const dataSource = useDashboard((s) => s.dataSource);

  const setData = useDashboard((s) => s.setData);
  const setError = useDashboard((s) => s.setError);
  const setLoading = useDashboard((s) => s.setLoading);

  // StrictMode runs effects twice in dev — guard against a double fetch.
  const startedRef = useRef(false);

  useEffect(() => {
    // StrictMode invokes effects twice in dev — skip the second run.
    // We deliberately do NOT use a `cancelled` flag inside the closure:
    // StrictMode's cleanup would set it before the fetch resolves and
    // silently discard the result. Zustand `setData` is safe to call
    // regardless of component lifecycle.
    if (startedRef.current) return;
    startedRef.current = true;

    const applyFallback = (reason: string): void => {
      const parsed = buildFallbackData(RAW_TIMELINE, { ...LAB_MAP });
      const { seriesEpoch, seriesFull } = buildBothSeries(parsed);
      setData({
        labMap: parsed.labMap,
        dataCenters: parsed.dataCenters,
        timeline: parsed.timeline,
        seriesEpoch,
        seriesFull,
        source: 'fallback',
      });
      console.warn(`[useEpochData] Using fallback data: ${reason}`);
    };

    setLoading(true);

    fetchEpoch()
      .then((raw) => {
        const parsed = parseEpochData(raw.dcRows, raw.tlRows);

        // If Epoch returned timelines but no DC rows, parseEpochData gives
        // an empty dataCenters array. In that case synthesize DCs from the
        // timeline using the fallback metadata.
        if (parsed.dataCenters.length === 0) {
          const fallback = buildFallbackData(RAW_TIMELINE, { ...LAB_MAP });
          parsed.dataCenters = fallback.dataCenters;
          parsed.labMap = { ...fallback.labMap, ...parsed.labMap };
        }

        const { seriesEpoch, seriesFull } = buildBothSeries(parsed);
        setData({
          labMap: parsed.labMap,
          dataCenters: parsed.dataCenters,
          timeline: parsed.timeline,
          seriesEpoch,
          seriesFull,
          source: 'epoch',
        });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[useEpochData] fetch/parse failed', err);
        setError(msg);
        applyFallback(msg);
      });
    // Actions from the store are stable references — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loading,
    error,
    stale: dataSource === 'fallback',
  };
}
