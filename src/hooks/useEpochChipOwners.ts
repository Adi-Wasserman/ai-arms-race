import { useCallback, useEffect, useRef } from 'react';

import {
  loadChipOwnershipData,
  readChipOwnersCache,
} from '@/services/chipOwners';
import { useDashboard } from '@/store';
import type { EpochChipOwnersData } from '@/types';

export interface UseEpochChipOwnersResult {
  data: EpochChipOwnersData | null;
  loading: boolean;
  error: string | null;
  /** ISO timestamp of when the slice last received a payload. */
  lastUpdated: string | null;
  /**
   * `true` when the current `data` was served from a cached payload —
   * either fresh (< 24h) or stale (network failed and we fell back).
   */
  fromCache: boolean;
  /**
   * Force-refresh the dataset from the network, bypassing the cache TTL.
   * Resolves once the new data is in the store, or rejects on full failure.
   */
  refresh: () => Promise<void>;
}

/**
 * Subscribes to the Epoch AI Chip Owners ZIP and keeps the
 * `chipOwnersSlice` populated. Triggers exactly one fetch on first
 * mount across the whole app (guarded by a module-level singleton
 * promise so multiple components calling the hook share one network
 * request).
 *
 * The hook follows the same pattern as `useEpochData`:
 *   - Hydrates from localStorage on mount if a fresh cache exists
 *     (no network round-trip on the happy path).
 *   - Otherwise fetches the ZIP, parses with JSZip + PapaParse,
 *     writes the derived snapshot into the slice.
 *   - Falls back to a stale cache on network failure.
 */

/** Module-level singleton fetch promise (multi-caller dedupe). */
let inflightFetch: Promise<void> | null = null;
/** Module-level guard so the StrictMode double-mount doesn't double-fetch. */
let bootstrapStarted = false;

export function useEpochChipOwners(): UseEpochChipOwnersResult {
  const data = useDashboard((s) => s.chipOwners);
  const loading = useDashboard((s) => s.chipOwnersLoading);
  const error = useDashboard((s) => s.chipOwnersError);
  const lastUpdated = useDashboard((s) => s.chipOwnersLastUpdated);
  const source = useDashboard((s) => s.chipOwnersSource);

  const setChipOwners = useDashboard((s) => s.setChipOwners);
  const setLoading = useDashboard((s) => s.setChipOwnersLoading);
  const setError = useDashboard((s) => s.setChipOwnersError);

  /** Local guard for the very first effect call this hook instance. */
  const startedRef = useRef(false);

  /**
   * Internal loader. Returns the singleton promise if one is already
   * in flight so multiple callers always share one fetch.
   */
  const runLoad = useCallback(
    (forceRefresh: boolean): Promise<void> => {
      if (inflightFetch) return inflightFetch;

      const promise = (async () => {
        setLoading(true);
        try {
          const result = await loadChipOwnershipData({ forceRefresh });
          setChipOwners(result.data, result.source);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[useEpochChipOwners] load failed', err);
          setError(msg);
        } finally {
          inflightFetch = null;
        }
      })();

      inflightFetch = promise;
      return promise;
    },
    // Slice setters are stable Zustand functions — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Bootstrap on first mount.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (bootstrapStarted) return;
    bootstrapStarted = true;

    // Synchronously hydrate from cache (if present + fresh-or-stale)
    // so the UI has SOMETHING to render before the network finishes.
    const cached = readChipOwnersCache();
    if (cached) {
      setChipOwners(cached.data, cached.stale ? 'cache-stale-fallback' : 'cache-fresh');
    }

    // Even if we hydrated from a fresh cache, kick off `runLoad` —
    // the orchestration in services/chipOwners will short-circuit on
    // a fresh cache and noop. If the cache was stale, it'll re-fetch.
    void runLoad(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    // `forceRefresh: true` bypasses the TTL check and always hits network.
    await runLoad(true);
  }, [runLoad]);

  const fromCache =
    source === 'cache-fresh' || source === 'cache-stale-fallback';

  return { data, loading, error, lastUpdated, fromCache, refresh };
}
