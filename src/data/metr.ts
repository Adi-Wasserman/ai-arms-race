import type { MetrDataPoint } from '@/types';

/**
 * METR Time Horizons — 50% task-completion time horizon.
 * Source: https://metr.org/time-horizons/ (TH 1.1, last updated May 2026).
 * Tuple format: [release date, model name, 50% horizon in minutes, showLabel (1=yes)].
 * Doubling time ~129 days (95% CI: 104–158 days) since 2023.
 *
 * NOTE: TH 1.1 values are significantly higher than earlier secondary-source
 * estimates (LessWrong/OfficeChai). The official METR evaluation suite includes
 * 228 tasks, with 31 tasks ≥ 8 hours. Older model estimates shifted down;
 * recent models shifted up vs TH 1.0.
 */
export const METR_HORIZONS: readonly MetrDataPoint[] = [
  ['2019-02-14', 'GPT-2',                       3.2,     1],
  ['2022-03-15', 'GPT-3.5 Turbo',              36.0,     0],
  ['2023-03-14', 'GPT-4',                      239.3,     1],
  ['2024-03-04', 'Claude 3 Opus',              237.1,     0],
  ['2024-05-13', 'GPT-4o',                     419.5,     1],
  ['2024-06-20', 'Claude 3.5 Sonnet',          683.6,     0],
  ['2024-09-12', 'o1 Preview',                1219.6,     0],
  ['2024-10-22', 'Claude 3.5 Sonnet (Oct)',   1231.7,     0],
  ['2024-12-05', 'o1 Elicited',               2491.0,     1],
  ['2024-12-26', 'DeepSeek V3',               1189.4,     0],
  ['2025-02-24', 'Claude 3.7 Sonnet',         3623.3,     0],
  ['2025-04-16', 'o3',                        7183.8,     1],
  ['2025-04-16', 'o4-mini',                   4604.9,     0],
  ['2025-05-22', 'Claude 4 Sonnet',           4419.6,     0],
  ['2025-05-22', 'Claude 4 Opus',             5014.0,     0],
  ['2025-07-09', 'Grok 4',                    6289.1,     0],
  ['2025-08-05', 'Claude 4.1 Opus',           6555.8,     0],
  ['2025-08-07', 'GPT-5',                     7849.0,     1],
  ['2025-11-18', 'Gemini 3 Pro',             13459.6,     0],
  ['2025-11-19', 'GPT-5.1 Codex Max',       13422.9,     0],
  ['2025-11-24', 'Claude Opus 4.5',          17579.8,     1],
  ['2025-12-11', 'GPT-5.2',                 21135.0,     0],
  ['2026-02-05', 'Claude Opus 4.6',          43128.4,     1],
  ['2026-02-05', 'GPT-5.3 Codex',           20971.8,     0],
  ['2026-02-19', 'Gemini 3.1 Pro',          23048.8,     0],
  ['2026-03-05', 'GPT-5.4',                 20504.1,     0],
] as const;
