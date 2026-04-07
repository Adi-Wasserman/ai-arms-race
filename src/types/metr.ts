/** Raw METR row: [release date, model name, horizon in minutes, showLabel (1=yes)]. */
export type MetrDataPoint = readonly [
  date: string,
  model: string,
  horizonMinutes: number,
  showLabel: 0 | 1,
];

/** Parsed METR observation used by the chart layer. */
export interface MetrHorizon {
  date: string;
  model: string;
  horizonMinutes: number;
  showLabel: boolean;
}
