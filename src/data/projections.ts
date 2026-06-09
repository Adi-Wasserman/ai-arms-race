import type { ProjectionTargetMap } from '@/types';

/**
 * 2029 Projection — Power-Constrained Target Model (June 2026 refresh).
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
 *   - Vera Rubin (NVIDIA next-gen, 2027+): ~3× H100e, higher rack density
 *   - Trainium3: ~60% improvement over Trn2 → ~1490 H100e/MW
 *   - TPU Ironwood: ~2.3× H100e, similar power → ~2140 H100e/MW
 *
 * Stargate (Epoch blog, May 2026): 7 US sites, >9 GW planned.
 *   Abilene 1.2 GW (operational 0.3 GW), Shackelford 2.0 GW,
 *   Dona Ana NM 2.2 GW, Milam TX 1.2 GW, Port Washington WI 1.3 GW,
 *   Saline MI 1.4 GW, Lordstown OH <0.3 GW. Most by Q4 2028.
 *
 * Colossus (xAI, Jan 2026): 2 GW target with 3rd building (MACROHARDRR).
 *   555K GPUs at single site; goal 1M GPUs total.
 */
export const PROJ_2029_TARGETS: ProjectionTargetMap = {
  OpenAI: {
    h: 15_000_000,
    p: 12_000,
    basis:
      'Stargate 7-site pipeline (>9 GW by Q4 2028, Epoch satellite) + Azure fleet (Fairwater, Goodyear, Osmium) + GB200/Vera Rubin efficiency gains.',
  },
  Gemini: {
    h: 10_000_000,
    p: 5_500,
    basis:
      'Epoch satellite (~5M from 14 tracked sites) + Ironwood TPU internal fleet (~5M). Google owns all hardware.',
  },
  Meta: {
    h: 7_000_000,
    p: 4_200,
    basis:
      'Epoch satellite only (Prometheus 1.2M, Hyperion 4.2M, Temple, Jeffersonville, Kuna, Rosemount). Owned infra, no cloud-lease.',
  },
  xAI: {
    h: 3_500_000,
    p: 2_500,
    basis:
      'Colossus 1+2 expansion to 2 GW (555K GPUs, MACROHARDRR 3rd building). Goal 1M GPUs. Epoch satellite data.',
  },
  Anthropic: {
    h: 10_000_000,
    p: 6_000,
    basis:
      'Epoch satellite (~2.5M: Rainier, Ridgeland, Fluidstack) + 3-cloud fleet (AWS Trainium ~1M, GCP TPU ~1.4M, Azure/NVIDIA ~1M) + Google/Broadcom multi-GW TPU deal for 2027+ (~4M).',
  },
} as const;

/* ANALYST_ESTIMATES (SemiAnalysis/AA Q1 2026 cross-checks) removed —
   stale and no longer displayed. See git history if ever needed. */
