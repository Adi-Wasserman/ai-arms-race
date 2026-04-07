import type { MetrDataPoint } from '@/types';

/**
 * METR Time Horizons — 50% task-completion time horizon (TH1.1, updated 2026-03-03).
 * Source: https://metr.org/time-horizons/ + benchmark_results_1_1.yaml
 * Tuple format: [release date, model name, 50% horizon in minutes, showLabel (1=yes)].
 * Doubling time ~123 days (4 months) since 2023.
 */
export const METR_HORIZONS: readonly MetrDataPoint[] = [
  ['2019-02-14', 'GPT-2',              0.15, 1],
  ['2020-06-11', 'GPT-3',              0.25, 1],
  ['2022-03-15', 'GPT-3.5',            0.4,  1],
  ['2023-03-14', 'GPT-4',              1.2,  1],
  ['2024-05-13', 'GPT-4o',             3.2,  0],
  ['2024-09-12', 'o1',                 8.5,  0],
  ['2025-01-31', 'DeepSeek-R1',        7.8,  0],
  ['2025-02-24', 'Claude 3.7 Sonnet',  12,   0],
  ['2025-04-16', 'o3',                 19,   1],
  ['2025-04-16', 'o4-mini',            14,   0],
  ['2025-06-27', 'DeepSeek-V3',        4.8,  0],
  ['2025-07-20', 'Grok 4',             42,   0],
  ['2025-08-06', 'GPT-5',              137,  1],
  ['2025-08-06', 'Claude Opus 4.1',    95,   0],
  ['2025-09-30', 'Claude Sonnet 4.5',  88,   0],
  ['2025-11-19', 'GPT-5.1 Codex Max',  178,  0],
  ['2025-12-19', 'Claude Opus 4.5',    289,  1],
  ['2026-01-15', 'GPT-5.2 (high)',     330,  1],
  ['2026-02-03', 'Gemini 3 Pro',       270,  0],
  ['2026-02-05', 'Claude Opus 4.6',    870,  1],
  ['2026-02-20', 'GPT-5.3 Codex',      540,  0],
] as const;
