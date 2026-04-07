import type { AnalystEstimateMap, ProjectionTargetMap } from '@/types';

/**
 * 2029 Projection — Power-Constrained Target Model.
 *
 * Instead of compound growth (which gives physically impossible results),
 * per-lab Jan 2029 targets are derived from:
 *   Layer 1: Epoch satellite facility ramps (already in RAW_TIMELINE through late 2028)
 *   Layer 2: Cloud-lease fleet growth (extends FLEET_ESTIMATES into 2029)
 * No Layer 3 (speculative new facilities) — only sourced capacity.
 *
 * Power is the binding constraint. New power sources:
 *   - Grid interconnection queue: 2-5 year wait (DOE data)
 *   - Substation construction: 18-36 months
 *   - Natural gas bridge turbines: 12-18 months
 *   - SMR/nuclear: not operational before 2030
 *
 * Chip efficiency improvements by 2029:
 *   - GB200/B200: ~2.5× H100e per chip, ~1.2KW → ~2080 H100e/MW
 *   - Trainium3: ~60% improvement over Trn2 → ~1490 H100e/MW
 *   - TPU Ironwood: ~2.3× H100e, similar power → ~2140 H100e/MW
 *   - Vera Rubin (NVIDIA next-gen): ~3× H100e est.
 */
export const PROJ_2029_TARGETS: ProjectionTargetMap = {
  OpenAI: {
    h: 12_000_000,
    p: 10_500,
    basis: 'Stargate pipeline + GB200 ramp. Epoch tracks through 2028.',
  },
  Gemini: {
    h: 9_000_000,
    p: 5_000,
    basis: 'Epoch satellite (~4M) + Ironwood TPU fleet (~5M). Existing power.',
  },
  Meta: {
    h: 6_000_000,
    p: 3_800,
    basis: 'Epoch satellite only. Owned infra, no cloud-lease.',
  },
  xAI: {
    h: 2_200_000,
    p: 2_000,
    basis: 'Colossus 1+2 ramp. Epoch satellite data.',
  },
  Anthropic: {
    h: 9_000_000,
    p: 5_500,
    basis:
      'Epoch satellite (~2M) + 3-cloud fleet including multi-GW Google/Broadcom TPU deal announced Apr 2026 for 2027+ delivery (~7–9M total). All sourced.',
  },
} as const;

/**
 * Analyst cross-check estimates (H100e, Q1 2026).
 * Independent validation against Epoch satellite data.
 */
export const ANALYST_ESTIMATES: AnalystEstimateMap = {
  OpenAI: {
    semi: 1_800_000,
    aa: 1_700_000,
    note: "Stargate + Azure (SemiAnalysis Q1 '26, AA Q1 '26)",
  },
  Gemini: {
    semi: 2_100_000,
    aa: null,
    note: "Incl. TPUv5+ fleet est. (SemiAnalysis Q1 '26)",
  },
  Meta: {
    semi: 900_000,
    aa: 850_000,
    note: "Owned infra only (SemiAnalysis Q1 '26, AA Q1 '26)",
  },
  xAI: {
    semi: 600_000,
    aa: null,
    note: "Colossus 1+2 (SemiAnalysis Q1 '26)",
  },
  Anthropic: {
    semi: 1_500_000,
    aa: 1_400_000,
    note: "3-cloud est. incl. new ~3.5 GW Google/Broadcom TPU deal announced Apr 6 2026 (SemiAnalysis Q1 '26, AA Q1 '26)",
  },
} as const;
