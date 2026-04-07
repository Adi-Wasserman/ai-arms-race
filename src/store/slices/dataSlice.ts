import type { StateCreator } from 'zustand';

import type {
  EpochDataCenter,
  EpochTimelineEvent,
  LabMap,
  ProjectionBands,
  TimeSeriesPoint,
} from '@/types';

import type { DashboardState } from '../index';

/** Status of the most recent data load. */
export type DataSource = 'epoch' | 'fallback' | null;

/**
 * Payload passed into `setData`. The hook layer is responsible for fetching,
 * parsing, and pre-building both series variants before calling this.
 */
export interface DataPayload {
  labMap: LabMap;
  dataCenters: EpochDataCenter[];
  timeline: EpochTimelineEvent[];
  /** Satellite-verified series (Epoch entries only). */
  seriesEpoch: TimeSeriesPoint[];
  /** Satellite + cloud-lease fleet series. */
  seriesFull: TimeSeriesPoint[];
  source: DataSource;
}

export interface DataSlice {
  /** Handle → lab mapping (merged fallback + Epoch). */
  labMap: LabMap;
  dataCenters: EpochDataCenter[];
  timeline: EpochTimelineEvent[];
  seriesEpoch: TimeSeriesPoint[];
  seriesFull: TimeSeriesPoint[];

  /**
   * Cached 2029 projection bands. `null` means the cache is stale — the
   * `activeProj` selector will recompute on demand. Actions that change
   * inputs (`setScope`, `setMetric`, `setData`) null this out.
   */
  proj2029: ProjectionBands | null;

  loading: boolean;
  error: string | null;
  dataSource: DataSource;
  lastUpdated: string | null;
  /** Bumped on every successful `setData` call. */
  dataVersion: number;

  setData: (payload: DataPayload) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  /** Store a freshly computed projection in the cache slot. */
  setProjections: (bands: ProjectionBands | null) => void;
  /** Drop the cached projections — next read will recompute. */
  invalidateProjections: () => void;
}

export const createDataSlice: StateCreator<
  DashboardState,
  [],
  [],
  DataSlice
> = (set) => ({
  labMap: {},
  dataCenters: [],
  timeline: [],
  seriesEpoch: [],
  seriesFull: [],
  proj2029: null,
  loading: true,
  error: null,
  dataSource: null,
  lastUpdated: null,
  dataVersion: 0,

  setData: (payload) =>
    set((state) => ({
      labMap: payload.labMap,
      dataCenters: payload.dataCenters,
      timeline: payload.timeline,
      seriesEpoch: payload.seriesEpoch,
      seriesFull: payload.seriesFull,
      dataSource: payload.source,
      lastUpdated: new Date().toISOString(),
      dataVersion: state.dataVersion + 1,
      loading: false,
      error: null,
      // Any new dataset invalidates the projection cache.
      proj2029: null,
    })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setProjections: (bands) => set({ proj2029: bands }),
  invalidateProjections: () => set({ proj2029: null }),
});
